import { Movie, Actor, DBTag } from "../../api/db/types";


export interface DataType {
  movies: Movie[];
  actorMap: Map<string, Actor>;
  tagMap: Map<string, DBTag>;
}