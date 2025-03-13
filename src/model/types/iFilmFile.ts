export interface IFilmFile {
    fileId: number;
    filmId: number;
    storageKey: string;
    filename?: string;
    mimeType?: string;
  }
  
  export type IFilmFileCreate = Omit<IFilmFile, 'fileId'>;
  export type IFilmFileUpdate = Partial<IFilmFileCreate>;
  export type IFilmFileRO = Readonly<IFilmFile>;