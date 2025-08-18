import { CUSTOM_ELEMENTS_SCHEMA, NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import {FormsModule,ReactiveFormsModule} from "@angular/forms";
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { LoginComponent } from './login/login.component';
import { ToastrModule } from 'ngx-toastr';
import { CommonModule } from '@angular/common';
import { HomeComponent } from './home/home.component';
import { HTTP_INTERCEPTORS, provideHttpClient } from '@angular/common/http';
import {BrowserAnimationsModule} from "@angular/platform-browser/animations";
import { AuthInterceptorService } from './services/auth-interceptor.service';
import { SiteDataComponent } from './site-data/site-data.component';
import { SiteStatusComponent } from './site-status/site-status.component';
import { HttpClientModule } from '@angular/common/http';
import {NzSpinModule} from "ng-zorro-antd/spin";
import { HeaderComponent } from './header/header.component';
import { DashbordComponent } from './dashbord/dashbord.component';
import { AdminMemberComponent } from './dashbord/admin-member/admin-member.component';
import { AdminSiteComponent } from './dashbord/admin-site/admin-site.component';
import { AsideComponent } from './dashbord/aside/aside.component';
import { TotalMembersComponent } from './dashbord/total-members/total-members.component';
import {NgChartsModule} from "ng2-charts";
import {NgxPaginationModule} from "ngx-pagination";
import { NgArrayPipesModule } from 'ngx-pipes';
import { ChangePasswordComponent } from './dashbord/change-password/change-password.component';
import { LicenceExpiredComponent } from './licence-expired/licence-expired.component';
import { RouterModule } from '@angular/router';
import { AnalysisComponent } from './analysis/analysis.component';
import { SiteAnalysisComponent } from './site-analysis/site-analysis.component';
import { AnalysisDetailsComponent } from './analysis-details/analysis-details.component';
import { MeteoComponent } from './meteo/meteo.component';
import { ModemsComponent } from './modems/modems.component';
import { AdminModemsComponent } from './dashbord/admin-modems/admin-modems.component';
import { ReloadSiteComponent } from './dashbord/reload-site/reload-site.component';
import { RefreshSiteComponent } from './dashbord/refresh-site/refresh-site.component';
import { AdminProjectComponent } from './dashbord/admin-project/admin-project.component';
import { ListProjectsComponent } from './list-projects/list-projects.component';
import { AdminPanneauComponent } from './dashbord/admin-panneau/admin-panneau.component';
import { PanneausComponent } from './panneaus/panneaus.component';
import { TotalComponantComponent } from './total-componant/total-componant.component';



@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    HomeComponent,
    SiteDataComponent,
    SiteStatusComponent,
    HeaderComponent,
    DashbordComponent,
    AdminMemberComponent,
    AdminSiteComponent,
    AsideComponent,
    TotalMembersComponent,
    ChangePasswordComponent,
    LicenceExpiredComponent,
    AnalysisComponent,
    SiteAnalysisComponent,
    AnalysisDetailsComponent,
    MeteoComponent,
    ModemsComponent,
    AdminModemsComponent,
    ReloadSiteComponent,
    RefreshSiteComponent,
    AdminProjectComponent,
    ListProjectsComponent,
    AdminPanneauComponent,
    PanneausComponent,
    TotalComponantComponent
  ],
  imports: [
    BrowserModule,
    
    AppRoutingModule,
    ToastrModule.forRoot({
      positionClass :'toast-bottom-right'
    }),
   FormsModule,
   ReactiveFormsModule,
   CommonModule,
   BrowserAnimationsModule,
   HttpClientModule,
   NzSpinModule,
   NgChartsModule,
   NgxPaginationModule,
   NgArrayPipesModule,

  ],
  providers: [provideHttpClient(),
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptorService, multi: true }
  ],
  bootstrap: [AppComponent],
  schemas: [
    CUSTOM_ELEMENTS_SCHEMA,
    NO_ERRORS_SCHEMA
  ]
})
export class AppModule { }
