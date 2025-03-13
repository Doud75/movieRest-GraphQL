// Définition d'une structure IActor
export interface IActor {
  actor_id: number;
  first_name: string;
  last_name: string;
  last_update?: Date;
}

// Ici, on rend tous les champs "lecture seul". Typescript ne va pas autoriser l'affectation des champs
export type IActorRO = Readonly<IActor>;

export type IActorCreate = Omit<IActor, 'actor_id'>;

export type IActorUpdate = Partial<IActorCreate>;
