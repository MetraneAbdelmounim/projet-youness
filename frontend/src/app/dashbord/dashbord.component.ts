import {Component, OnDestroy, OnInit} from '@angular/core';

import {Chart, ChartConfiguration, ChartItem,ChartType, registerables} from 'chart.js'

import {SiteService} from "../services/site.service";
import{config} from "../../Config/config"


import {Site} from "../models/site";
import {NzMessageService} from "ng-zorro-antd/message";
@Component({
  selector: 'app-dashbord',
  templateUrl: './dashbord.component.html',
  styleUrls: ['./dashbord.component.scss']
})
export class DashbordComponent implements OnInit,OnDestroy {
  // @ts-ignore
  sites: Array<Site>=new Array<Site>()

  labels : Array<string>=new Array<string>()
  battery : Array<Number>=new Array<Number>()
  labels_bar: Array<string>=new Array<string>()
  colors : Array<string>=new Array<string>()
  maxVolt : Array<Number>=new Array<Number>()
  spinnerSite: boolean=false;
  upVoltage:Number=0
  // @ts-ignore
   chart: Chart<"bar" | "line" | "scatter" | "bubble" | "pie" | "doughnut" | "polarArea" | "radar", [ChartTypeRegistry[TType]["defaultDataPoint"]] extends [unknown] ? Array<ChartTypeRegistry[TType]["defaultDataPoint"]> : never, unknown>;
  constructor(private siteServices:SiteService,private message:NzMessageService) { }

  ngOnInit(): void {
    this.destroy()
    this.spinnerSite=true
    let upSite = 0
    // @ts-ignore
    this.siteServices.getAllSites().subscribe((sites:Site[])=>{
      sites.forEach(s=>{
        if(s.Battery_Voltage!=0){
          upSite=upSite+1
        }

        this.labels.push(s.nom)
        this.battery.push(s.Battery_Voltage)
        this.labels_bar.push(s.ip)
        this.maxVolt.push(config.Battery_Max)
        this.colors.push(this.getColor(s.Battery_Voltage>config.Battery_Max?true:false))
      })

      this.createChart(this.labels,this.battery,this.colors,this.labels_bar,this.maxVolt)
      console.log(upSite)
      this.upVoltage=(upSite/sites.length)*100
      this.sites=sites
      this.spinnerSite=false
    },err=>{
      this.spinnerSite=false
      this.message.error("Une erreur est survenue ! ", {nzDuration: config.durationMessage})
    })
    document.body.style.paddingLeft = "15rem"
  }

  ngOnDestroy(): void {
    document.body.style.paddingLeft = "0rem"
  }

  createChart(labels: Array<string>, battery: Array<any>, colors: Array<string>, labels_bar: Array<any>,maxVolt:Array<any>): void {
    Chart.register(...registerables);
    const data = {
      labels: labels,
      datasets: [{
        backgroundColor: colors,
        borderColor:"#005e03",
        borderWidth:1,
        data: battery,
        label:"Battery Voltage",
        order:2
      },{
        label:"Voltage Lithium Battery",
        type: 'line' as ChartType,
        borderColor:"#011d3b",
        borderWidth:2,
        data: maxVolt,
        order:1
      }]
    };
    const options = {
      scales: {
        y: {
          beginAtZero: true,
          display: true,
          stacked:true
        },
        x:{
          stacked: true,
        }
      },
      plugins: {
        title: {
          display: true,
          text: 'Battery Voltage Monitoring',
          color: '#911',
          font: {
            family: 'Comic Sans MS',
            size: 20,
            weight: 'bold',
            lineHeight: 1.2,
          },
        },

      },

    }


    const config: ChartConfiguration = {
      type: 'bar',
      data: data,
      options: options
    }
    const chartItem: ChartItem = document.getElementById('my-chart') as ChartItem
    this.chart = new Chart(chartItem, config)
  }

  getRandomColor():string {
    return '#' + (Math.random().toString(16) + '0000000').slice(2, 8);
  }

  onRefresh(chart:any) {
    this.chart.destroy()
    this.ngOnInit()
  }

  private destroy() {
    this.labels= new Array<string>()
    this.sites=new Array<Site>()
    this.labels=new Array<string>()
    this.labels_bar=new Array<string>()
    this.colors=new Array<string>()
    this.maxVolt=new Array<Number>()
    this.upVoltage=0


  }

  private getColor(isValid: boolean) {
    if(isValid) return "#61e18a"
    else return "#ff5454"
  }
}
