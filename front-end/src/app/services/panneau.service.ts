import { Injectable } from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {environment} from "../../environments/environment";

const BACKEND_URL = environment.apiUri

@Injectable({
  providedIn: 'root'
})
export class PanneauService {

  constructor(private http:HttpClient) { }

   getAllPanneaus(){
    return this.http.get(BACKEND_URL+'panneaus')
  }
  getPanneausByProject(idProject:string){
    return this.http.get(BACKEND_URL+'panneaus/projects/'+idProject)
  }
  addPanneau(stockData:any) {
    return this.http.post(BACKEND_URL+'panneaus/',stockData)
  }
  deletePanneau(_id: string) {
    return this.http.delete(BACKEND_URL+'panneaus/'+_id)
  }
  editPanneau(_id: string | undefined, panneauData: any) {

    return this.http.put(BACKEND_URL+'panneaus/'+_id,panneauData)
  }
  addPanneauFromFile(fileData : File) {


    // @ts-ignore
    let dataUpload = new FormData();
    dataUpload.append('file', fileData)

    return this.http.post(BACKEND_URL + 'panneaus/file', dataUpload)
  }
  getPanneauStatus(ip: string) {
    return this.http.get(BACKEND_URL + 'panneaus/status/'+ip)
  }
  exportToExcel() {
    return this.http.get(`${BACKEND_URL}panneaus/export`, {
      responseType: 'blob',
    });
  }

}
