import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { HomeComponent } from './home/home.component';
import { LicenceGuardService } from './services/licence-guard.service';
import { AuthGuardService } from './services/auth-guard.service';
import { DashbordComponent } from './dashbord/dashbord.component';
import { AdminSiteComponent } from './dashbord/admin-site/admin-site.component';
import { AdminGuardService } from './services/admin-guard.service';
import { AdminMemberComponent } from './dashbord/admin-member/admin-member.component';
import { ChangePasswordComponent } from './dashbord/change-password/change-password.component';
import { LicenceExpiredComponent } from './licence-expired/licence-expired.component';
import { AnalysisComponent } from './analysis/analysis.component';
import { AnalysisDetailsComponent } from './analysis-details/analysis-details.component';
import { ModemsComponent } from './modems/modems.component';
import { AdminModemsComponent } from './dashbord/admin-modems/admin-modems.component';
import { AdminProjectComponent } from './dashbord/admin-project/admin-project.component';
import { ListProjectsComponent } from './list-projects/list-projects.component';
import { AdminPanneauComponent } from './dashbord/admin-panneau/admin-panneau.component';
import { PanneauService } from './services/panneau.service';
import { PanneausComponent } from './panneaus/panneaus.component';

const routes: Routes = [
  {path:'' ,component: LoginComponent},
  {path:'project/:id/mppt' ,component: HomeComponent,canActivate:[LicenceGuardService,AuthGuardService]},
  {path:'project/:id/analysis' ,component: AnalysisComponent,canActivate:[LicenceGuardService,AuthGuardService]},
  {path:'project/:id/modems' ,component: ModemsComponent,canActivate:[LicenceGuardService,AuthGuardService]},
  {path:'project/:id/panneaux' ,component: PanneausComponent,canActivate:[LicenceGuardService,AuthGuardService]},
  {path:'project/:id/dashbord' ,component: DashbordComponent,canActivate:[LicenceGuardService,AuthGuardService]},
  {path:'projects' ,component: ListProjectsComponent,canActivate:[LicenceGuardService,AuthGuardService]},
  {path:'project/:idProject/analysis/:idSite', component: AnalysisDetailsComponent ,canActivate:[LicenceGuardService,AuthGuardService]},
  {path:'license-expired' ,component: LicenceExpiredComponent ,canActivate:[AuthGuardService]},
  {path:'dashbord/sites' ,component: AdminSiteComponent,canActivate:[LicenceGuardService,AuthGuardService,AdminGuardService]},
  {path:'dashbord/members' ,component: AdminMemberComponent,canActivate:[LicenceGuardService,AuthGuardService,AdminGuardService]},
  {path:'dashbord/modems' ,component: AdminModemsComponent,canActivate:[LicenceGuardService,AuthGuardService,AdminGuardService]},
  {path:'dashbord/panneaux' ,component: AdminPanneauComponent,canActivate:[LicenceGuardService,AuthGuardService,AdminGuardService]},
  {path:'dashbord/projects' ,component: AdminProjectComponent,canActivate:[LicenceGuardService,AuthGuardService,AdminGuardService]},
  {path:'dashbord/change-password' ,component: ChangePasswordComponent,canActivate:[LicenceGuardService,AuthGuardService]},
  {path:'**', redirectTo:'projects'}

];

@NgModule({
  imports: [RouterModule.forRoot(routes,{useHash:true})],
  exports: [RouterModule]
})
export class AppRoutingModule { }
