import { Injectable } from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {environment} from "../../environments/environment";

const BACKEND_URL = environment.apiUri

@Injectable({
  providedIn: 'root'
})
export class ModemService {

  constructor(private http:HttpClient) { }

   getAllModems(){
    return this.http.get(BACKEND_URL+'modems')
  }
  getModemsByProject(idProject:string){
    return this.http.get(BACKEND_URL+'modems/projects/'+idProject)
  }
  addModem(stockData:any) {
    return this.http.post(BACKEND_URL+'modems/',stockData)
  }
  deleteModem(_id: string) {
    return this.http.delete(BACKEND_URL+'modems/'+_id)
  }
  editModem(_id: string | undefined, modemData: any) {

    return this.http.put(BACKEND_URL+'modems/'+_id,modemData)
  }
  addModemFromFile(fileData : File) {


    // @ts-ignore
    let dataUpload = new FormData();
    dataUpload.append('file', fileData)

    return this.http.post(BACKEND_URL + 'modems/file', dataUpload)
  }
  getModemStatus(ip: string) {
    return this.http.get(BACKEND_URL + 'modems/status/'+ip)
  }
  exportToExcel() {
    return this.http.get(`${BACKEND_URL}modems/export`, {
      responseType: 'blob',
    });
  }

}
