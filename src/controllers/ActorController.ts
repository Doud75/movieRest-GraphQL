import { IActor, IActorCreate, IActorUpdate } from '@model/types/IActor';
import { IORMCreateResponse, IORMDeleteResponse, IORMIndexResponse, IORMUpdateResponse } from '@orm/interfaces/IORM';
import { ORM } from '@orm/ORM';
import { Body, Delete, Get, Patch, Path, Put, Query, Route, Security } from 'tsoa';
import { log } from 'winston';

const READ_COLUMNS = [
    'actor_id',
    'first_name',
    'last_name',
    'last_update'
];

/**
 * Un acteur de la plateforme.
 */
@Route("/actor")
@Security('jwt')
export class ActorController {

  /**
   * Récupérer une page d'acteur.
   */
  @Get()
  public async getActors(
    /** La page (zéro-index) à récupérer */
    @Query() page?: string,    
    /** Le nombre d'éléments à récupérer (max 50) */
    @Query() limit?: string,    
  ): Promise<IORMIndexResponse<IActor>> {    
    return ORM.Index<IActor>({
      table: 'actor',
      columns: READ_COLUMNS,
      query: { page, limit },
    });
  }

  /**
   * Créer un nouvel acteur
   */
  @Put()
  public async createActor(
    @Body() body: IActorCreate
  ): Promise<IORMCreateResponse> {
    return ORM.Create<IActorCreate>({
      table: 'actor',
      body,
    });
  }

  /**
   * Récupérer un acteur avec le ID passé dans le URL
   */
  @Get('{actorId}')
  public async readActor(
    @Path() actorId: number
  ): Promise<IActor> {
    return ORM.Read<IActor>({
      table: 'actor', 
      idKey: 'actor_id', 
      idValue: actorId,
      columns: READ_COLUMNS
    });
  }

  /**
   * Mettre à jour un acteur avec le ID passé dans le URL
   */
  @Patch('{actorId}')
  public async updateActor(
    @Path() actorId: number,
    @Body() body: IActorUpdate
  ): Promise<IORMUpdateResponse> {
    return ORM.Update<IActorUpdate>({
      table: 'actor',
      idKey: 'actor_id', 
      idValue: actorId, 
      body,
    });
  }
  
  /**
   * Supprimer un acteur
   */
  @Delete('{actorId}')
  public async deleteActor(
    @Path() actorId: number,
  ): Promise<IORMDeleteResponse> {
    return ORM.Delete({
      table: 'actor', 
      idKey: 'actor_id', 
      idValue: actorId, 
    });
  }
}
