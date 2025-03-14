import { IUser, IUserCreate, IUserUpdate } from "@model/types/IUser";
import { IUserFile } from "@model/types/IUserFile";
import { IFilm } from "@model/types/IFilm";
import { IActor } from "@model/types/IActor";
import { ORM } from "@orm/ORM";
import { GraphQLResolveInfo } from "graphql";

const READ_COLUMNS_USER = ['userId', 'familyName', 'givenName', 'email'];
const READ_COLUMNS_FILM = ['film_id', 'title', 'description', 'release_year'];

export const GRAPHQL_RESOLVERS = {
  Query: {
    users: async () => {
      const users = await ORM.Index<IUser>({
        table: 'user',
        columns: READ_COLUMNS_USER,
      });
      return users.rows;
    },
    user: async (_: any, { userId }: { userId: number }) => {
      return ORM.Read<IUser>({
        table: 'user',
        idKey: 'userId',
        idValue: userId,
        columns: READ_COLUMNS_USER
      });
    },
    films: async () => {
      return ORM.Index<IFilm>({
        table: "film",
        columns: READ_COLUMNS_FILM,
      });
    },
    film: async (_: any, { film_id }: { film_id: number }) => {
      return ORM.Read<IFilm>({
        table: "film",
        idKey: "film_id",
        idValue: film_id,
        columns: READ_COLUMNS_FILM,
      });
    },
  },
  User: {
    files: async (parent: IUser) => {
      const files = await ORM.Index<IUserFile>({
        table: 'user_file',
        columns: ['fileId', 'userId', 'storageKey', 'filename', 'mimeType'],
        where: {
          userId: parent.userId
        }
      });
      return files.rows;
    }
  },
  Film: {
    actors: async (parent: IFilm) => {
      try {
        console.log(`Fetching actors for film ID: ${parent.film_id}`);
  
        const actors = await ORM.FindManyToMany<IActor>({
          mainTable: "film",
          mainKey: "film_id",
          mainValue: parent.film_id,
          joinTable: "film_actor",
          joinKey: "actor_id",
          targetTable: "actor",
          targetColumns: ["actor_id", "first_name", "last_name"], // ✅ Pas besoin de "actor."
        });
  
        console.log(`Actors found: `, actors); // 🧐 Debug
  
        if (!actors || actors.length === 0) {
          console.warn(`No actors found for film ID: ${parent.film_id}`);
          return [];
        }
  
        return actors;
      } catch (error) {
        console.error(`Error retrieving actors for film ${parent.film_id}:`, error);
        throw new Error("Failed to retrieve actors for the film.");
      }
    },
  },  
  Mutation: {
    addUser: async (_: any, args: IUserCreate) => {
      const result = await ORM.Create<IUserCreate>({
        table: 'user',
        body: args,
      });
      return await ORM.Read<IUser>({
        table: 'user',
        idKey: 'userId',
        idValue: result.id,
        columns: READ_COLUMNS_USER
      });
    },
    updateUser: async (_: any, { userId, user }: { userId: number, user: IUserUpdate }) => {
      const result = await ORM.Update<IUserUpdate>({
        table: 'user',
        idKey: 'userId',
        idValue: userId,
        body: user,
      });
      return await ORM.Read<IUser>({
        table: 'user',
        idKey: 'userId',
        idValue: result.id,
        columns: READ_COLUMNS_USER
      });
    },
    deleteUser: async (_: any, { userId }: { userId: number }) => {
      await ORM.Delete({
        table: 'user',
        idKey: 'userId',
        idValue: userId,
      });
      return true;
    },
  }
};
