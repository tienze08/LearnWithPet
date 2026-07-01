import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";


import {
  addBookmarkApi,
  removeBookmarkApi,
  getBookmarksApi,
} from "@/api/bookmark.api";



export function useBookmarksQuery(){

  return useQuery({

    queryKey:["bookmarks"],

    queryFn:getBookmarksApi,

  });

}





export function useAddBookmarkMutation(){

 const queryClient = useQueryClient();


 return useMutation({

  mutationFn:(vocabularyId:number)=>
    addBookmarkApi(vocabularyId),


  onSuccess:()=>{

    queryClient.invalidateQueries({
      queryKey:["bookmarks"]
    });


    queryClient.invalidateQueries({
      queryKey:["vocabularies"]
    });

  }

 });

}





export function useRemoveBookmarkMutation(){

 const queryClient = useQueryClient();


 return useMutation({

  mutationFn:(vocabularyId:number)=>
    removeBookmarkApi(vocabularyId),


  onSuccess:()=>{


    queryClient.invalidateQueries({
      queryKey:["bookmarks"]
    });


    queryClient.invalidateQueries({
      queryKey:["vocabularies"]
    });


  }

 });

}