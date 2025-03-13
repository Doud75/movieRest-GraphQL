import { IFilm, IFilmCreate, IFilmUpdate } from '@model/types/IFilm';
import { IActor} from '@model/types/IActor';
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
  @Security('jwt', ['admin'])
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
  @Security('jwt', ['admin'])
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
  @Security('jwt', ['admin'])
  public async deleteFilm(
    @Path() filmId: number,
  ): Promise<IORMDeleteResponse> {
    return ORM.Delete({
      table: 'film', 
      idKey: 'film_id', 
      idValue: filmId, 
    });
  }

  /**
   * 🔹 Récupérer tous les acteurs d'un film.
   */
  @Get('{filmId}/actor')
  public async getActorsByFilm(@Path() filmId: number): Promise<IActor[]> {
    return ORM.FindManyToMany<IActor>({
      mainTable: 'film',
      mainKey: 'film_id',
      mainValue: filmId,
      joinTable: 'film_actor',
      joinKey: 'actor_id',
      targetTable: 'actor',
      targetColumns: ['actor.actor_id', 'actor.first_name', 'actor.last_name']
    });
  }

  /**
   * 🔹 Récupérer un acteur spécifique d'un film.
   */
  @Get('{filmId}/actor/{actorId}')
  public async getActorByFilm(@Path() filmId: number, @Path() actorId: number): Promise<IActor | null> {
    const actors = await ORM.FindManyToMany<IActor>({
      mainTable: 'film',
      mainKey: 'film_id',
      mainValue: filmId,
      joinTable: 'film_actor',
      joinKey: 'actor_id',
      targetTable: 'actor',
      targetColumns: ['actor.actor_id', 'actor.first_name', 'actor.last_name']
    });

    return actors.find(actor => actor.actor_id === actorId) || null;
  }

  /**
   * 🔹 Ajouter un acteur à un film (ADMIN uniquement).
   */
  @Put('{filmId}/actor/{actorId}')
  @Security('jwt', ['admin']) // 🔒 Seuls les admins peuvent modifier
  public async addActorToFilm(@Path() filmId: number, @Path() actorId: number): Promise<{ success: boolean }> {
    await ORM.ManageManyToMany({
      mainTable: 'film',
      mainKey: 'film_id',
      mainValue: filmId,
      joinTable: 'film_actor',
      joinKey: 'actor_id',
      targetValue: actorId
    }, 'add');

    return { success: true };
  }

  /**
   * 🔹 Supprimer un acteur d'un film (ADMIN uniquement).
   */
  @Delete('{filmId}/actor/{actorId}')
  @Security('jwt', ['admin']) // 🔒 Seuls les admins peuvent modifier
  public async removeActorFromFilm(@Path() filmId: number, @Path() actorId: number): Promise<{ success: boolean }> {
    await ORM.ManageManyToMany({
      mainTable: 'film',
      mainKey: 'film_id',
      mainValue: filmId,
      joinTable: 'film_actor',
      joinKey: 'actor_id',
      targetValue: actorId
    }, 'remove');

    return { success: true };
  }
}
