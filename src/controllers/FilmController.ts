import { IFilm, IFilmCreate, IFilmUpdate } from '@model/types/IFilm';
import { IORMCreateResponse, IORMDeleteResponse, IORMIndexResponse, IORMUpdateResponse } from '@orm/interfaces/IORM';
import { ORM } from '@orm/ORM';
import { Body, Delete, Get, Patch, Path, Put, Query, Route, Security } from 'tsoa';
import { log } from 'winston';

const READ_COLUMNS = [
    'film_id',
    'title',
    'description',
    'release_year',
    'rental_duration',
    'rental_rate',
    'length',
    'replacement_cost',
    'rating',
    'special_features',
    'last_update'
];

/**
 * Un film de la plateforme.
 */
@Route("/film")
@Security('jwt')
export class FilmController {

  /**
   * Récupérer une page de film.
   */
  @Get()
  public async getFilms(
    /** La page (zéro-index) à récupérer */
    @Query() page?: string,    
    /** Le nombre d'éléments à récupérer (max 50) */
    @Query() limit?: string,    
  ): Promise<IORMIndexResponse<IFilm>> {    
    return ORM.Index<IFilm>({
      table: 'film',
      columns: READ_COLUMNS,
      query: { page, limit },
    });
  }

  /**
   * Créer un nouveau film
   */
  @Put()
  public async createFilm(
    @Body() body: IFilmCreate
  ): Promise<IORMCreateResponse> {
    return ORM.Create<IFilmCreate>({
      table: 'film',
      body,
    });
  }

  /**
   * Récupérer un film avec le ID passé dans le URL
   */
  @Get('{filmId}')
  public async readFilm(
    @Path() filmId: number
  ): Promise<IFilm> {
    return ORM.Read<IFilm>({
      table: 'film', 
      idKey: 'film_id', 
      idValue: filmId,
      columns: READ_COLUMNS
    });
  }

  /**
   * Mettre à jour un film avec le ID passé dans le URL
   */
  @Patch('{filmId}')
  public async updateFilm(
    @Path() filmId: number,
    @Body() body: IFilmUpdate
  ): Promise<IORMUpdateResponse> {
    return ORM.Update<IFilmUpdate>({
      table: 'film',
      idKey: 'film_id', 
      idValue: filmId, 
      body,
    });
  }
  
  /**
   * Supprimer un film
   */
  @Delete('{filmId}')
  public async deleteFilm(
    @Path() filmId: number,
  ): Promise<IORMDeleteResponse> {
    return ORM.Delete({
      table: 'film', 
      idKey: 'film_id', 
      idValue: filmId, 
    });
  }
}
