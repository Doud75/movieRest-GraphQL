import { ApiError } from "@error/ApiError";
import { ErrorCode } from "@error/ErrorCodes";
import { DbTable } from "@model/DbTable";
import { ResultSetHeader, RowDataPacket } from "mysql2";
import { DB } from "./DB";
import { 
  IORMCreateResponse,
  IORMIndexRequest,
  IORMIndexResponse,
  IORMCreateRequest,
  IORMTableCount,
  IORMUpdateResponse,
  IORMReadRequest,
  IORMUpdateRequest,
  IORMManageManyToManyRequest,
  IORMFindManyToManyRequest
} from "./interfaces/IORM";


/**
 * Class qui fournit des fonctions utilitaires pour les opérations ICRUD.
 */
export class ORM {

  /**
   * Ajoute une ligne dans la base de données
   * @param options 
   * @returns ICreateResponse
   */
  public static async Create<T>(options: IORMCreateRequest<T>): Promise<IORMCreateResponse> {
    const db = DB.Connection;
    const data = await db.query<ResultSetHeader>(`insert into ${options.table} set ?`, options.body);

    return {
      id: data[0].insertId
    }   
  }

  /**
   * Récupérer une page de lignes d'une table, en précisant les colonnes souhaitées   
   */
  public static async Index<T>(options: IORMIndexRequest) : Promise<IORMIndexResponse<T>> {

    const db = DB.Connection;      
    // On suppose que le params query sont en format string, et potentiellement
    // non-numérique, ou corrompu
    const page = parseInt(options.query?.page || "0") || 0;
    const limit = parseInt(options.query?.limit || "10") || 0;
    
    const offset = page * limit;

    // D'abord, récupérer le nombre total
    let whereClause = '';
    let whereValues: any[] = [];
    if (options.where) {
      const whereList: string[] = [];
      Object.entries(options.where).forEach(
        ([key, value]) => {
          whereList.push(key + ' = ?');
          whereValues.push(value);
        }
      )
      whereClause = 'where  ' + whereList.join(' and ');
    }

    // console.log(mysql.format(`select count(*) as total from ${table} ${whereClause}`, whereValues))

    const count = await db.query<IORMTableCount[] & RowDataPacket[]>(`select count(*) as total from ${options.table} ${whereClause}`, whereValues);      

    // Récupérer les lignes
    const sqlBase = `select ${options.columns.join(',')} from ${options.table} ${whereClause} limit ? offset ?`;
    const data = await db.query<T[] & RowDataPacket[]>(sqlBase, [...whereValues, limit, offset].filter(e => e !== undefined));

    // Construire la réponse
    const res: IORMIndexResponse<T> = {
      page,
      limit,
      total: count[0][0].total,
      rows: data[0]
    }

    return res;
  }

  /**
   * Récupérer une ligne dans la base de données, étant donné son identifiant
   * @param options 
   * @returns 
   * @throws ApiError si aucune ligne n'est trouvée
   */
  public static async Read<T>(options: IORMReadRequest): Promise<T> {
    const db = DB.Connection;
    const data = await db.query<T[] & RowDataPacket[]>(`select ${options.columns.join(',')} from ${options.table} where ${options.idKey} = ?`, [options.idValue]);      

    if (data[0].length > 0) {
      return data[0][0];
    } else {
      throw new ApiError(ErrorCode.BadRequest, 'sql/not-found', `Could not read row with ${options.idKey} = ${options.idValue}`);
    }
  }



  public static async Update<T>(options: IORMUpdateRequest<T>): Promise<IORMUpdateResponse> {
    const db = DB.Connection;

    const data = await db.query<ResultSetHeader>(`update ${options.table} set ? where ${options.idKey} = ?`, [options.body, options.idValue]);

    return {
      id: options.idValue,
      rows: data[0].affectedRows
    } 
  }
  

  public static async Delete(options: {
    table: DbTable, 
    idKey: string, 
    idValue: number|string
  }): Promise<IORMUpdateResponse> {
    const db = DB.Connection;
    const data = await db.query<ResultSetHeader>(`delete from ${options.table} where ${options.idKey} = ?`, [options.idValue]);      

    return {
      id: options.idValue,
      rows: data[0].affectedRows
    }  
  }

  /**
   * Récupérer les relations `many-to-many`
   */
  public static async FindManyToMany<T>(options: IORMFindManyToManyRequest): Promise<T[]> {
    const db = DB.Connection;
    try {
      const query = `
        SELECT ${options.targetColumns.join(", ")}
        FROM ${options.targetTable}
        INNER JOIN ${options.joinTable} ON ${options.joinTable}.${options.joinKey} = ${options.targetTable}.${options.joinKey}
        WHERE ${options.joinTable}.${options.mainKey} = ?
      `;
      const [rows] = await db.query<T[] & RowDataPacket[]>(query, [options.mainValue]);

      return rows.length > 0 ? rows : [];
    } catch (error) {
      throw new ApiError(ErrorCode.BadRequest, 'sql/query-failed', `Erreur lors de la récupération des relations ${options.joinTable}`, { details: error });
    }
  }

  /**
   * Vérifier si une relation existe dans une table de liaison
   */
  public static async RelationExists(options: IORMManageManyToManyRequest): Promise<boolean> {
    const db = DB.Connection;
    try {
      const query = `
        SELECT COUNT(*) as count
        FROM ${options.joinTable}
        WHERE ${options.mainKey} = ? AND ${options.joinKey} = ?
      `;
      const [rows] = await db.query<{ count: number }[] & RowDataPacket[]>(query, [options.mainValue, options.targetValue]);

      return rows[0].count > 0;
    } catch (error) {
      throw new ApiError(ErrorCode.BadRequest, 'sql/query-failed', `Erreur lors de la vérification de la relation dans ${options.joinTable}`, { details: error });
    }
  }

  /**
   * Ajouter ou supprimer une relation `many-to-many`
   */
  public static async ManageManyToMany(options: IORMManageManyToManyRequest, action: 'add' | 'remove') {
    const db = DB.Connection;

    try {
      if (action === 'add') {
        // Vérifier si la relation existe déjà
        const exists = await ORM.RelationExists(options);
        if (exists) {
          throw new ApiError(ErrorCode.BadRequest, 'sql/already-exists', `Relation déjà existante entre ${options.mainKey}=${options.mainValue} et ${options.joinKey}=${options.targetValue}`);
        }

        const query = `INSERT INTO ${options.joinTable} (${options.mainKey}, ${options.joinKey}) VALUES (?, ?)`;
        await db.query(query, [options.mainValue, options.targetValue]);

      } else if (action === 'remove') {
        // Vérifier si la relation existe avant de la supprimer
        const exists = await ORM.RelationExists(options);
        if (!exists) {
          throw new ApiError(ErrorCode.NotFound, 'sql/not-found', `Relation inexistante entre ${options.mainKey}=${options.mainValue} et ${options.joinKey}=${options.targetValue}`);
        }

        const query = `DELETE FROM ${options.joinTable} WHERE ${options.mainKey} = ? AND ${options.joinKey} = ?`;
        await db.query(query, [options.mainValue, options.targetValue]);
      }
    } catch (error) {
      throw new ApiError(ErrorCode.BadRequest, 'sql/query-failed', `Erreur lors de la gestion de la relation dans ${options.joinTable}`, { details: error });
    }
  }
}