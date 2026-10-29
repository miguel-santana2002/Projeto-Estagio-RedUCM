import { Component } from '@angular/core';
import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { LoginComponent } from './login/login.component';
import { PageNotFoundComponent } from './page-not-found/page-not-found.component';
import { authGuard } from './helper/auth.guard';
import { LandingpageComponent } from './landingpage/landingpage.component';
import { ManageUsersComponent } from './users/manage-users/manage-users.component';
import { CreateUserComponent } from './users/create-user/create-user.component';
import { ManageClientsComponent } from './clients/manage-clients/manage-clients.component';
import { CreateUseCaseComponent } from './usecases/create-use-case/create-use-case.component';
import { ManageUseCasesComponent } from './usecases/manage-use-cases/manage-use-cases.component';
import { UsecaseDetailsComponent } from './usecases/usecase-details/usecase-details.component';
import { CreateRuleModelComponent } from './rules/rule-models/create-rule-model/create-rule-model.component';
import { TechniqueDetailsComponent } from './techniques/technique-details/technique-details.component';
import { ManageRulesComponent } from './rules/instances/manage-rules/manage-rules.component';
import { RuleDetailsComponent } from './rules/instances/rule-details/rule-details.component';
import { StatisticsPageComponent } from './statistics/statistics-page/statistics-page.component';
import { EditUseCaseComponent } from './usecases/edit-use-case/edit-use-case.component';
import { ManageLogsourcesComponent } from './rules/manage-logsources/manage-logsources.component';
import { isAdminGuard } from './helper/is-admin.guard';
import { EditUserComponent } from './users/edit-user/edit-user.component';
import { EditClientComponent } from './clients/edit-client/edit-client.component';
import { CreateClientComponent } from './clients/create-client/create-client.component';
import { EditRuleModelComponent } from './rules/rule-models/edit-rule-model/edit-rule-model.component';
import { numericIdGuard } from './guards/numeric-id.guard';
import { AuditListComponent } from './audit/audit-list.component';
import { EditRuleComponent } from './rules/instances/edit-rule/edit-rule.component';
import { CreateRuleComponent } from './rules/instances/create-rule/create-rule.component';
import { EditLogsourceComponent } from './rules/edit-logsource/edit-logsource.component';
import { FeedbackComponent } from './feedback/feedback.component';

export const routes: Routes = [
  { path: '', component: LandingpageComponent, pathMatch: 'full' },
  { path: 'home', component: HomeComponent, canActivate: [authGuard] },
  { path: 'login', component: LoginComponent },
  {
    path: 'manage-users',
    component: ManageUsersComponent,
    canActivate: [isAdminGuard],
  },
  {
    path: 'create-user',
    component: CreateUserComponent,
    canActivate: [isAdminGuard],
  },
  {
    path: 'manage-clients',
    component: ManageClientsComponent,
    canActivate: [authGuard], // Permite qualquer utilizador autenticado ver a listagem
  },
  {
    path: 'create-client',
    component: CreateClientComponent,
    canActivate: [isAdminGuard],
  },
  {
    path: 'create-usecase',
    component: CreateUseCaseComponent,
  },
  { path: 'manage-usecases', component: ManageUseCasesComponent },
  {
    path: 'usecase-Details/:id',
    component: UsecaseDetailsComponent,
    canActivate: [numericIdGuard],
  },
  {
    path: 'create-rule',
    component: CreateRuleComponent,
  },
  {
    path: 'create-rule-model',
    component: CreateRuleModelComponent,
  },
  {
    path: 'ruleModel-Details/:id',
    component: RuleDetailsComponent,
    canActivate: [numericIdGuard],
  },
  {
    path: 'techniqueDetails/:id',
    component: TechniqueDetailsComponent,
  },
  {
    path: 'manage-rules',
    component: ManageRulesComponent,
  },
  {
    path: 'rule-Details/:id',
    component: RuleDetailsComponent,
    canActivate: [numericIdGuard],
  },
  { path: 'statistics', component: StatisticsPageComponent },
  {
    path: 'audit',
    component: AuditListComponent,
    canActivate: [isAdminGuard],
  },
  {
    path: 'edit-usecase/:id',
    component: EditUseCaseComponent,
    canActivate: [numericIdGuard],
  },
  {
    path: 'manage-logsources',
    component: ManageLogsourcesComponent,
  },
  {
    path: 'edit-user/:id',
    component: EditUserComponent,
    canActivate: [isAdminGuard, numericIdGuard],
  },
  {
    path: 'edit-client/:id',
    component: EditClientComponent,
    canActivate: [authGuard, numericIdGuard], // Removido o isAdminGuard da rota para permitir aceder (o componente bloqueia a gravação se for operador)
  },
  {
    path: 'edit-rule-model/:id',
    component: EditRuleModelComponent,
    canActivate: [numericIdGuard],
  },
  {
    path: 'edit-rule/:id',
    component: EditRuleComponent,
    canActivate: [numericIdGuard],
  },
  {
    path: 'edit-logsource/:id',
    component: EditLogsourceComponent,
    canActivate: [authGuard, numericIdGuard],
  },
  {
    path: 'feedback',
    component: FeedbackComponent,
    canActivate: [authGuard],
  },
  {
    path: 'page-not-found',
    component: PageNotFoundComponent,
  },
  {
    path: '**',
    component: PageNotFoundComponent,
  },
];
