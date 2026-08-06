import { Component, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { Project } from '../../models/project';
import { ProjectService } from '../../services/project.service';

@Component({
  selector: 'app-admin-project',
  standalone: false,
  templateUrl: './admin-project.component.html',
})
export class AdminProjectComponent implements OnInit {
  projects: Project[] = [];

  itemsPerPage = 15;
  page = 1;
  term = '';

  type: 'Create' | 'Edit' = 'Create';
  projectEdited: Project | null = null;
  idEditProject = '';
  deletedProjectId = '';
  deletedProjectName = '';

  crudOpen = false;
  deleteOpen = false;

  saving = false;
  spinnerSite = false;

  constructor(
    private projectService: ProjectService,
    private message: ToastrService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.spinnerSite = true;
    this.projectService.getAllProjects().subscribe({
      next: (projects) => {
        this.projects = projects;
        this.spinnerSite = false;
      },
      error: () => {
        this.spinnerSite = false;
        this.message.error('Une erreur est survenue !');
      },
    });
  }

  trackById(_index: number, project: Project): string {
    return project._id;
  }

  onSubmit(form: NgForm): void {
    if (!form.valid) return;

    this.saving = true;
    const request =
      this.type === 'Edit'
        ? this.projectService.editProject(this.idEditProject, form.value)
        : this.projectService.addProject(form.value);

    request.subscribe({
      next: (res) => {
        this.saving = false;
        this.crudOpen = false;
        this.message.success(res.message);
        form.resetForm();
        this.load();
      },
      error: (e) => {
        this.saving = false;
        this.message.error(e?.error?.error ?? 'Enregistrement impossible');
      },
    });
  }

  onEdit(project: Project): void {
    this.idEditProject = project._id;
    this.type = 'Edit';
    this.projectEdited = project;
    this.crudOpen = true;
  }

  openCrudModal(): void {
    this.type = 'Create';
    this.projectEdited = null;
    this.crudOpen = true;
  }

  openDeletedModal(project: Project): void {
    this.deletedProjectId = project._id;
    this.deletedProjectName = project.nom;
    this.deleteOpen = true;
  }

  remove(): void {
    if (!this.deletedProjectId) return;
    this.projectService.deleteProject(this.deletedProjectId).subscribe({
      next: (res) => {
        this.message.success(res.message);
        this.deleteOpen = false;
        this.load();
      },
      error: (e) => this.message.error(e?.error?.error ?? 'Suppression impossible'),
    });
  }
}
