import { Injectable } from '@angular/core';
import {HttpClient, HttpParams} from "@angular/common/http";
import {environment} from "../../environments/environment";

const BACKEND_URL = environment.apiUri
@Injectable({
  providedIn: 'root'
})
export class SiteService {
  
  

  constructor(private http:HttpClient) { }

  getAllSites(idProject:string){
    const params = new HttpParams()
      .set('project', idProject)
     
    return this.http.get(BACKEND_URL+'stations',{params})
  }
  
  getAllWithoutData(){
    return this.http.get(BACKEND_URL+'stations/ping')
  }
  getAllSitesByProjectWIthoutData(idProject:string){
    return this.http.get(BACKEND_URL+'stations/projects/'+idProject)
  }
  addSite(stockData:any) {
    return this.http.post(BACKEND_URL+'stations/',stockData)
  }
  deleteSite(_id: string) {
    return this.http.delete(BACKEND_URL+'stations/'+_id)
  }
  editSite(_id: string | undefined, userData: any) {

    return this.http.put(BACKEND_URL+'stations/'+_id,userData)
  }
  addSiteFromFile(fileData : File) {


    // @ts-ignore
    let dataUpload = new FormData();
    dataUpload.append('file', fileData)

    return this.http.post(BACKEND_URL + 'stations/file', dataUpload)
  }

  getSiteStatus(ip: string) {
    return this.http.get(BACKEND_URL + 'stations/status/'+ip)
  }
  getDataBySiteFromMppt(id: string) {
    return this.http.get(BACKEND_URL + 'stations/data/'+id)
  }
  exportToExcel() {
    return this.http.get(`${BACKEND_URL}stations/export`, {
      responseType: 'blob',
    });
  }
  getDataAnalysisBySiteFromMPPT(id:string){
    
    return this.http.get(BACKEND_URL + 'stations/data/analysis/'+id)
  }
  getSiteByIDWithoutData(id:string){
    return this.http.get(BACKEND_URL + 'stations/'+id)
  }
  reloadSite(id:string){
    return this.http.post(BACKEND_URL + 'stations/reload/'+id,{})
  }
  refreshSite(id:string){
    return this.http.post(BACKEND_URL + 'stations/refresh/'+id,{})
  }
  getMidnightReload() {
    return this.http.get(BACKEND_URL + 'stations/midnightReload',{})
  }
  changeMidnightReload(value:any) {
   return this.http.put(BACKEND_URL+'stations/midnightReload',value)
  }
}
