import { Injectable } from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {environment} from "../../environments/environment";

const BACKEND_URL = environment.apiUri
@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  constructor(private http:HttpClient) { }

   getAllProjects(){
    return this.http.get(BACKEND_URL+'projects')
  }
  getprojectByID(idProject:string){
    return this.http.get(BACKEND_URL+'projects/'+idProject)
  }
  addProject(stockData:any) {
    return this.http.post(BACKEND_URL+'projects/',stockData)
  }
 editProject(_id: string | undefined, projectData: any) {

    return this.http.put(BACKEND_URL+'projects/'+_id,projectData)
  }
  deleteProject(_id: string) {
    return this.http.delete(BACKEND_URL+'projects/'+_id)
  }

}
