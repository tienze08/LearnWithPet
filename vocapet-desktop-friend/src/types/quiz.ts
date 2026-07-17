import { PetBehaviorResponse } from "./pet";

export interface QuizQuestionResponse {
    vocabularyId:number;
    word:string;
    partOfSpeech:string;
    options:string[];
}

export interface QuizAnswerRequest{
    vocabularyId:number;
    answer:string;
}

export interface QuizAnswerResponse{
    correct:boolean;
    correctAnswer:string;
    xp:number;
    coin:number;
    petBehavior: PetBehaviorResponse;
}