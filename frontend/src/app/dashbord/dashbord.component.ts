import {Component, OnDestroy, OnInit} from '@angular/core';

import {Chart, ChartConfiguration, ChartItem,ChartType, registerables} from 'chart.js'

import {SiteService} from "../services/site.service";
import{config} from "../../Config/config"


import {Site} from "../models/site";
import {NzMessageService} from "ng-zorro-antd/message";
import { range } from 'rxjs';
@Component({
  selector: 'app-dashbord',
  templateUrl: './dashbord.component.html',
  styleUrls: ['./dashbord.component.scss']
})
export class DashbordComponent implements OnInit,OnDestroy {
  // @ts-ignore
  sites: Array<Site>=new Array<Site>()
  itemsPerPage: number = 7;
  page:number=1;
  // @ts-ignore
 labels : Array<string>=new Array<string>()
 term :string=""
  battery : Array<Number>=new Array<Number>()
  labels_bar: Array<string>=new Array<string>()
  colors : Array<string>=new Array<string>()
  maxVolt : Array<Number>=new Array<Number>()
  maxAGM : Array<Number>=new Array<Number>()
  spinnerSite: boolean=false;
  upVoltage:Number=0
  // @ts-ignore
   chart: Chart<"bar" | "line" | "scatter" | "bubble" | "pie" | "doughnut" | "polarArea" | "radar", [ChartTypeRegistry[TType]["defaultDataPoint"]] extends [unknown] ? Array<ChartTypeRegistry[TType]["defaultDataPoint"]> : never, unknown>;
  constructor(private siteServices:SiteService,private message:NzMessageService) { }

  ngOnInit(): void {
     document.body.style.paddingLeft = "15rem"
    this.destroy()
  
    this.spinnerSite=true
    let upSite = 0
    // @ts-ignore
    
    this.siteServices.getAllSites().subscribe( ()=>{
    // @ts-ignore
      this.siteServices.getAllWithoutData().subscribe((sites:Site[])=>{
       console.log(sites);
       
        sites.forEach(s=>{
          if(s.Battery_Voltage!=0){
            upSite=upSite+1
          }
  
          this.labels.push(s.nom)
          this.battery.push(s.Battery_Voltage)
          this.labels_bar.push(s.ip)
          this.maxVolt.push(config.Battery_Max_LTH)
          this.maxAGM.push(config.Battery_Max_AGM)
          this.colors.push(this.getColor(s.Battery_Voltage>config.Battery_Max_LTH?true:false))
        })
        
  
        this.createChart(this.labels,this.battery,this.colors,this.labels_bar,this.maxVolt,this.maxAGM)
        
        this.upVoltage=(upSite/sites.length)*100
        this.sites=sites
        this.spinnerSite=false
      },err=>{
        this.spinnerSite=false
        this.message.error("Une erreur est survenue ! ", {nzDuration: config.durationMessage})
      })
      
     
    },err=>{
      this.spinnerSite=false
      this.message.error("Une erreur est survenue ! ", {nzDuration: config.durationMessage})
    })
    document.body.style.paddingLeft = "15rem"
  }

  ngOnDestroy(): void {
    document.body.style.paddingLeft = "0rem"
    
    this.chart.destroy()
  }

  createChart(labels: Array<string>, battery: Array<any>, colors: Array<string>, labels_bar: Array<any>,maxVolt:Array<any>,maxAGM:Array<any>): void {
    Chart.register(...registerables);
    const data = {
      labels: labels,
      datasets: [{
        backgroundColor: colors,
        borderColor:"#003366",
        borderWidth:1,
        data: battery,
        label:"Battery Voltage",
        order:2
      },{
        label:"Max Voltage Lithium Battery",
        backgroundColor: "#000136",
        type: 'line' as ChartType,
        borderColor:"#000136",
        borderWidth:2,
        data: maxVolt,
        order:1
      },
        {
          label:"Max Voltage AGM Battery",
          backgroundColor: "#e0baba",
          type: 'line' as ChartType,
          borderColor:"#e0baba",
          borderWidth:2,
          data: maxAGM,
          order:1

        },
        {
          label:"Low Battery",
          backgroundColor:"#e65757",
          data: [],
          order : 3,

        },
        {
          label:"Good Battery",
          backgroundColor:"#63c985",
          data: [],
          order : 4,
        },

      ]
    };
    const options = {
      scales: {
        y: {
          min: 22,
          max:27,
          display: true,
          stacked:false,
          ticks: {
            // forces step size to be 50 units
            stepSize: 0.2
          }
        },
        x:{
          stacked: true,
        }
      },

      plugins: {
        title: {
          display: true,
          text: 'Battery Voltage Monitoring',
          color: '#003366',
          font: {
            family: 'Comic Sans MS',
            size: 20,
            weight: 'bold',
            lineHeight: 1.2,
          },
        },
        legend: {
          labels: {
                // @ts-ignore
            generateLabels: (chart) => {
              const original = Chart.defaults.plugins.legend.labels.generateLabels!;
              const labels = original(chart);

              // Filter out the label you want to hide (e.g., "Label 2").
              return labels.filter(label => label.text !== "Battery Voltage");
            },
          },
        },

      },

    }
    const image = new Image();
    image.src = 'assets/images/logo.png'; // Replace with the path to your logo
    image.onload = () => {

      const backgroundLogoPlugin = {
        id: 'backgroundLogo',
        beforeDraw: (chart: any) => {
          const { width, height, left, top } = chart.chartArea;
          const ctx = chart.ctx;

          // Draw the logo at the center of the chart
          const x = left + (width - image.width) / 2;
          const y = top + (height - image.height) / 2;

          ctx.save();
          ctx.globalAlpha = 0.25; // Adjust transparency
          ctx.drawImage(image, x, y, image.width, image.height);
          ctx.restore();
        },
      };

      // Register the plugin
      Chart.register(backgroundLogoPlugin);
      const config: ChartConfiguration = {
        type: 'bar',
        data: data,
        options: options
      }
      const chartItem: ChartItem = document.getElementById('my-chart') as ChartItem
      this.chart = new Chart(chartItem, config)
    }
    
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
    if(isValid) return "rgba(99, 201, 133, 0.80)"
    else return "rgba(230, 87, 87, 0.8)"
  }
}
