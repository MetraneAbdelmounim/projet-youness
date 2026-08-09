import { LOCALE_ID, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CommonModule, registerLocaleData } from '@angular/common';
import localeFrCa from '@angular/common/locales/fr-CA';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
  HTTP_INTERCEPTORS,
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import { ToastrModule } from 'ngx-toastr';
import { NgxPaginationModule } from 'ngx-pagination';
import { NgArrayPipesModule } from 'ngx-pipes';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AuthInterceptorService } from './services/auth-interceptor.service';

import { LoginComponent } from './login/login.component';
import { HomeComponent } from './home/home.component';
import { HeaderComponent } from './header/header.component';
import { SiteDataComponent } from './site-data/site-data.component';
import { SiteStatusComponent } from './site-status/site-status.component';
import { SiteAnalysisComponent } from './site-analysis/site-analysis.component';
import { AnalysisComponent } from './analysis/analysis.component';
import { AnalysisDetailsComponent } from './analysis-details/analysis-details.component';
import { MeteoComponent } from './meteo/meteo.component';
import { ModemsComponent } from './modems/modems.component';
import { PanneausComponent } from './panneaus/panneaus.component';
import { ListProjectsComponent } from './list-projects/list-projects.component';
import { LicenceComponent } from './licence/licence.component';
import { StationMapComponent } from './map/station-map.component';

import { MeasurePipe } from './ui/measure.pipe';
import { AdminNavComponent } from './ui/admin-nav.component';
import { ModalComponent } from './ui/modal.component';
import { StatusChipComponent } from './ui/status-chip.component';
import { StatTileComponent } from './ui/stat-tile.component';
import { EmptyStateComponent } from './ui/empty-state.component';
import { PageHeaderComponent } from './ui/page-header.component';
import { ThemeToggleComponent } from './ui/theme-toggle.component';

import { DashbordComponent } from './dashbord/dashbord.component';
import { AdminMemberComponent } from './dashbord/admin-member/admin-member.component';
import { AdminSiteComponent } from './dashbord/admin-site/admin-site.component';
import { AdminModemsComponent } from './dashbord/admin-modems/admin-modems.component';
import { AdminPanneauComponent } from './dashbord/admin-panneau/admin-panneau.component';
import { AdminProjectComponent } from './dashbord/admin-project/admin-project.component';
import { AdminSettingsComponent } from './dashbord/admin-settings/admin-settings.component';
import { TranslatePipe } from './i18n/translate.pipe';
import { LanguageToggleComponent } from './i18n/language-toggle.component';
import { ChangePasswordComponent } from './dashbord/change-password/change-password.component';

// The interface is entirely in French; without this every `| date` and
// `| number` fell back to en-US ("August 6, 2027", "1,234.5").
registerLocaleData(localeFrCa);

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    HomeComponent,
    HeaderComponent,
    SiteDataComponent,
    SiteStatusComponent,
    SiteAnalysisComponent,
    AnalysisComponent,
    AnalysisDetailsComponent,
    MeteoComponent,
    ModemsComponent,
    PanneausComponent,
    ListProjectsComponent,
    LicenceComponent,
    StationMapComponent,

    MeasurePipe,
    AdminNavComponent,
    ModalComponent,
    StatusChipComponent,
    StatTileComponent,
    EmptyStateComponent,
    PageHeaderComponent,
    ThemeToggleComponent,
    DashbordComponent,
    AdminMemberComponent,
    AdminSiteComponent,
    AdminModemsComponent,
    AdminPanneauComponent,
    AdminProjectComponent,
    AdminSettingsComponent,
    TranslatePipe,
    LanguageToggleComponent,
    ChangePasswordComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    AppRoutingModule,
    ToastrModule.forRoot({ positionClass: 'toast-bottom-right' }),
    NgxPaginationModule,
    NgArrayPipesModule,
  ],
  providers: [
    // `withInterceptorsFromDi` is what actually wires the HTTP_INTERCEPTORS
    // token in. The module previously registered both `provideHttpClient()`
    // and the deprecated `HttpClientModule`, so the interceptor only ran by
    // way of the duplicate registration.
    provideHttpClient(withInterceptorsFromDi()),
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptorService, multi: true },
    { provide: LOCALE_ID, useValue: 'fr-CA' },
  ],
  bootstrap: [AppComponent],
  // NO_ERRORS_SCHEMA was removed: it silenced unknown elements and bindings,
  // which is precisely the class of mistake `strictTemplates` is meant to catch.
})
export class AppModule {}
