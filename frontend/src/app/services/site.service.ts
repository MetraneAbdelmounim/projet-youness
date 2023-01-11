import { Injectable } from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {environment} from "../../environments/environment";

const BACKEND_URL = environment.apiUri
@Injectable({
  providedIn: 'root'
})
export class SiteService {

  constructor(private http:HttpClient) { }

  getAllSites(){
    return this.http.get(BACKEND_URL+'sites')
  }
  getAllWithoutData(){
    return this.http.get(BACKEND_URL+'sites/ping')
  }
  addSite(stockData:any) {
    return this.http.post(BACKEND_URL+'sites',stockData)
  }
  deleteSite(_id: string) {
    return this.http.delete(BACKEND_URL+'sites/'+_id)
  }
  editSite(_id: string | undefined, userData: any) {

    return this.http.put(BACKEND_URL+'sites/'+_id,userData)
  }
  addSiteFromFile(fileData : File) {


    // @ts-ignore
    let dataUpload = new FormData();
    dataUpload.append('file', fileData)

    return this.http.post(BACKEND_URL + 'sites/file', dataUpload)
  }

  getSiteStatus(ip: string) {
    return this.http.get(BACKEND_URL + 'sites/status/'+ip)
  }
  getDataBySiteFromMppt(id: string) {
    return this.http.get(BACKEND_URL + 'sites/data/'+id)
  }
}
