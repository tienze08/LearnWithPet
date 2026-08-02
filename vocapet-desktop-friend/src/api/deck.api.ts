import { apiFetch } from "./client";


export interface DeckRequest {

  name:string;

  description:string;

  emoji:string;

  color:string;

}



export interface DeckResponse {

  id:number;

  name:string;

  description:string;

  emoji:string;

  color:string;

  wordCount:number;

}



export function getDecksApi(){

  return apiFetch<DeckResponse[]>(
    "/api/decks",
    {
      method:"GET",
    }
  );

}



export function createDeckApi(
  payload:DeckRequest
){

  return apiFetch<DeckResponse>(
    "/api/decks",
    {
      method:"POST",
      body:JSON.stringify(payload),
    }
  );

}



export function updateDeckApi(
  id:number,
  payload:DeckRequest
){

  return apiFetch<DeckResponse>(
    `/api/decks/${id}`,
    {
      method:"PUT",
      body:JSON.stringify(payload),
    }
  );

}



export function deleteDeckApi(id:number){

  return apiFetch<string>(
    `/api/decks/${id}`,
    {
      method:"DELETE",
    }
  );

}