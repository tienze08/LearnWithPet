import { apiFetch } from "./client";


export interface BookmarkResponse {

  id:number;

  vocabularyId:number;

  word:string;

  meaning:string;

  example:string;

  difficulty:string;

  partOfSpeech:string;

  deckId:number;

}



export function addBookmarkApi(
  vocabularyId:number
){

  return apiFetch<BookmarkResponse>(
    `/api/bookmarks/${vocabularyId}`,
    {
      method:"POST",
    }
  );

}



export function removeBookmarkApi(
  vocabularyId:number
){

  return apiFetch<void>(
    `/api/bookmarks/${vocabularyId}`,
    {
      method:"DELETE",
    }
  );

}



export function getBookmarksApi(){

  return apiFetch<BookmarkResponse[]>(
    "/api/bookmarks",
    {
      method:"GET",
    }
  );

}