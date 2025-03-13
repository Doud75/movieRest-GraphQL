
// Définition d'une structure IFilm
export interface IFilm {
    film_id: number;
    title: string;
    description?: string;
    release_year?: number;
    language_id: number;
    original_language_id?: number;
    rental_duration?: number;
    rental_rate?: number;
    length?: number;
    replacement_cost?: number;
    rating?: 'G' | 'PG' | 'PG-13' | 'R' | 'NC-17';
    special_features?: ('Trailers' | 'Commentaries' | 'Deleted Scenes' | 'Behind the Scenes')[];
    last_update?: string;
}
  
  
// Ici, on rend tous les champs "lecture seul". Typescript ne va pas autoriser l'affectation des champs
export type IFilmRO = Readonly<IFilm>;

export type IFilmCreate = Omit<IFilm, 'film_id'>;

export type IFilmUpdate = Partial<IFilmCreate>;