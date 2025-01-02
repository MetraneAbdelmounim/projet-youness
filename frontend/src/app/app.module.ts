import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import {FormsModule} from "@angular/forms";
import {RouterModule, Routes} from "@angular/router";
import { LoginComponent } from './login/login.component';
import {HTTP_INTERCEPTORS, HttpClientModule} from "@angular/common/http";
import {BrowserAnimationsModule} from "@angular/platform-browser/animations";
import {NzMessageServiceModule} from "ng-zorro-antd/message";
import {OverlayModule} from "@angular/cdk/overlay";
import {en_US, NZ_I18N} from "ng-zorro-antd/i18n";
import {NZ_ICON_DEFAULT_TWOTONE_COLOR, NZ_ICONS} from "ng-zorro-antd/icon";
import { HomeComponent } from './home/home.component';
import { DashbordComponent } from './dashbord/dashbord.component';
import { AsideComponent } from './dashbord/aside/aside.component';
import { AdminSiteComponent } from './dashbord/admin-site/admin-site.component';
import {NzSpinModule} from "ng-zorro-antd/spin";
import {Ng2SearchPipeModule} from "ng2-search-filter";
import {NgxPaginationModule} from "ngx-pagination";
import {IconDefinition} from "@ant-design/icons-angular";
import {DeleteOutline, PlusOutline} from "@ant-design/icons-angular/icons";
import {NzModalModule, NzModalService} from "ng-zorro-antd/modal";
import {AuthInterceptorService} from "./services/auth-interceptor.service";
import {AdminGuardService} from "./services/admin-guard.service";

import { HeaderComponent } from './header/header.component';
import {NgChartsModule} from "ng2-charts";
import Annotation from "chartjs-plugin-annotation";
import { FooterComponent } from './footer/footer.component';
import { SiteStatusComponent } from './site-status/site-status.component';
import { SiteDataComponent } from './site-data/site-data.component';
import { AdminMemberComponent } from './dashbord/admin-member/admin-member.component';
import { AuthGuardService } from './services/auth-guard.service';
import { AppRoutingModule } from './app-routing.module';
import { TotalMembersComponent } from './dashbord/total-members/total-members.component';
import { LicenceExpiredComponent } from './licence-expired/licence-expired.component';
import { LicenceGuardService } from './services/licence-guard.service';

const icons: IconDefinition[] = [ PlusOutline,DeleteOutline ];
const appRoutes: Routes = [
  {path:'' ,component: LoginComponent},
  {path:'home' ,component: HomeComponent,canActivate:[LicenceGuardService,AuthGuardService]},
  {path:'dashbord' ,component: DashbordComponent,canActivate:[LicenceGuardService,AuthGuardService]},
  {path:'license-expired' ,component: LicenceExpiredComponent},
  {path:'dashbord/sites' ,component: AdminSiteComponent,canActivate:[LicenceGuardService,AuthGuardService,AdminGuardService]},
  {path:'dashbord/members' ,component: AdminMemberComponent,canActivate:[LicenceGuardService,AuthGuardService,AdminGuardService]},
  {path:'**', redirectTo:'home'}
]


// @ts-ignore
@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    HomeComponent,
    DashbordComponent,
    AsideComponent,
    AdminSiteComponent,
    HeaderComponent,
    FooterComponent,
    SiteStatusComponent,
    SiteDataComponent,
    AdminMemberComponent,
    TotalMembersComponent,
    LicenceExpiredComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    RouterModule.forRoot(appRoutes, {useHash: true}),
    FormsModule,
    HttpClientModule,
    BrowserAnimationsModule,
    NzMessageServiceModule,
    OverlayModule,
    NzSpinModule,
    Ng2SearchPipeModule,
    NgxPaginationModule,
    NzModalModule,
    NgChartsModule,
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptorService, multi: true },
    { provide: NZ_I18N, useValue: en_US },
    { provide: NZ_I18N, useValue: en_US },
    { provide: NZ_ICON_DEFAULT_TWOTONE_COLOR, useValue: '#00ff00' }, // If not provided, it is Ant Design's theme blue
    { provide: NZ_ICONS, useValue: icons } // If not provided, it is Ant Design's theme blue
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
