import { Component, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { forkJoin } from 'rxjs';
import { Member } from '../../models/member';
import { Project } from '../../models/project';
import { MemberService } from '../../services/member.service';
import { ProjectService } from '../../services/project.service';

@Component({
  selector: 'app-admin-member',
  standalone: false,
  templateUrl: './admin-member.component.html',
})
export class AdminMemberComponent implements OnInit {
  members: Member[] = [];
  projects: Project[] = [];

  itemsPerPage = 15;
  page = 1;
  term = '';

  type: 'Create' | 'Edit' = 'Create';
  memberEdited: Member | null = null;
  idEditMember = '';
  deletedMemberId = '';
  deletedMemberName = '';

  crudOpen = false;
  deleteOpen = false;
  /** Shown once after creation — the only moment the password exists in clear. */
  createdCredentials: { username: string; password: string } | null = null;

  saving = false;
  spinnerMember = false;

  selectedProjects: string[] = [];

  constructor(
    private memberService: MemberService,
    private projectService: ProjectService,
    private message: ToastrService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.spinnerMember = true;

    forkJoin({
      projects: this.projectService.getAllProjects(),
      members: this.memberService.getAllMembers(),
    }).subscribe({
      next: ({ projects, members }) => {
        this.projects = projects;
        this.members = members;
        this.spinnerMember = false;
      },
      error: () => {
        this.spinnerMember = false;
        this.message.error('Une erreur est survenue !');
      },
    });
  }

  trackById(_index: number, member: Member): string {
    return member._id;
  }

  get adminCount(): number {
    return this.members.filter((m) => m.isAdmin).length;
  }

  toggleProject(projectId: string): void {
    const index = this.selectedProjects.indexOf(projectId);
    if (index === -1) this.selectedProjects.push(projectId);
    else this.selectedProjects.splice(index, 1);
  }

  isProjectSelected(projectId: string): boolean {
    return this.selectedProjects.includes(projectId);
  }

  onSubmit(form: NgForm): void {
    if (!form.valid) return;
    this.saving = true;

    const payload = { ...form.value, projects: this.selectedProjects };

    if (this.type === 'Edit') {
      this.memberService.editMember(this.idEditMember, payload).subscribe({
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
      return;
    }

    this.memberService.addMember(payload).subscribe({
      next: (res) => {
        this.saving = false;
        this.crudOpen = false;
        // The temporary password is random and returned once. Accounts no longer
        // start with a password derived from the username.
        this.createdCredentials = {
          username: res.member.username,
          password: res.temporaryPassword,
        };
        form.resetForm();
        this.load();
      },
      error: (e) => {
        this.saving = false;
        this.message.error(e?.error?.error ?? 'Création impossible');
      },
    });
  }

  copyPassword(): void {
    if (!this.createdCredentials) return;
    void navigator.clipboard
      .writeText(this.createdCredentials.password)
      .then(() => this.message.success('Mot de passe copié'))
      .catch(() => this.message.error('Copie impossible'));
  }

  onEdit(member: Member): void {
    this.idEditMember = member._id;
    this.type = 'Edit';
    this.memberEdited = member;
    this.selectedProjects = (member.projects ?? []).map((p) => p._id);
    this.crudOpen = true;
  }

  openCrudModal(): void {
    this.type = 'Create';
    this.memberEdited = null;
    this.selectedProjects = [];
    this.crudOpen = true;
  }

  openDeletedModal(member: Member): void {
    this.deletedMemberId = member._id;
    this.deletedMemberName = member.username;
    this.deleteOpen = true;
  }

  remove(): void {
    if (!this.deletedMemberId) return;
    this.memberService.deleteMember(this.deletedMemberId).subscribe({
      next: (res) => {
        this.message.success(res.message);
        this.deleteOpen = false;
        this.load();
      },
      error: (e) => this.message.error(e?.error?.error ?? 'Suppression impossible'),
    });
  }

  onChangeNotification(member: Member): void {
    this.memberService.changeNotification(member._id, !member.notification).subscribe({
      next: (result) => {
        this.message.success(result.message);
        this.load();
      },
      error: () => {
        this.message.error('Une erreur est survenue lors de la modification');
        this.load();
      },
    });
  }
}
