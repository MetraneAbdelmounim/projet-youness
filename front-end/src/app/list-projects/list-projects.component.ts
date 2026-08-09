import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { I18nService } from '../i18n/i18n.service';
import { Project } from '../models/project';
import { ProjectService } from '../services/project.service';

@Component({
  selector: 'app-list-projects',
  standalone: false,
  templateUrl: './list-projects.component.html',
  styleUrl: './list-projects.component.css',
})
export class ListProjectsComponent implements OnInit, OnDestroy {
  projects: Project[] = [];
  spinnerSite = true;

  private readonly subscriptions = new Subscription();

  constructor(
    private projectService: ProjectService,
    private router: Router,
    private message: ToastrService,
    private i18n: I18nService
  ) {}

  ngOnInit(): void {
    // Read the project list from the API, which scopes it to the caller,
    // rather than from the member payload embedded in the auth response.
    this.subscriptions.add(
      this.projectService.getAllProjects().subscribe({
        next: (projects) => {
          this.projects = projects;
          this.spinnerSite = false;
        },
        error: () => {
          this.spinnerSite = false;
          this.message.error(this.i18n.t('projects.loadFailed'));
        },
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  trackById(_index: number, project: Project): string {
    return project._id;
  }

  dahsbord(projectId: string): void {
    void this.router.navigate(['/project', projectId, 'dashbord']);
  }
}
