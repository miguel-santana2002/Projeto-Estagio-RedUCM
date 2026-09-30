import { Component, TemplateRef, ViewChild } from '@angular/core';
import {
  FormsModule,
  FormGroup,
  FormControl,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';

import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { AuthService } from '../services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatDividerModule,
    MatButtonModule,
    MatProgressBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatDialogModule,
    CommonModule,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  @ViewChild('otpModal') otpModal!: TemplateRef<any>;

  loginForm: FormGroup;
  otpForm: FormGroup;
  showOtpForm = false;
  otpMethod: string = '';
  qrCodeUrl: string = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    public dialog: MatDialog,
  ) {
    this.loginForm = new FormGroup({
      email: new FormControl('', [Validators.required, Validators.email]),
      password: new FormControl('', Validators.required),
    });

    this.otpForm = new FormGroup({
      otp: new FormControl('', [
        Validators.required,
        Validators.minLength(6),
        Validators.maxLength(6),
      ]),
    });
  }

  errorMessage = '';

  onSubmit() {
    if (this.loginForm.valid) {
      const { email, password } = this.loginForm.value;
      this.authService.login(email, password).subscribe({
        next: (response: any) => {
          this.errorMessage = '';
          if (response.otpSent) {
            this.otpMethod = response.otpMethod!;
            this.showOtpForm = true;

            // Só chama generate-totp se for o 1º acesso (showTotp == true)
            if (this.otpMethod === 'totp' && response.showTotp) {
              this.onGenerateTOTP(email);
            }
          } else {
            this.router.navigate(['/home']);
          }
        },
        error: () => {
          this.errorMessage = 'Credenciais inválidas para início de sessão';
        },
      });
    }
  }

  onVerifyOtp() {
    if (this.otpForm.valid) {
      const otp = this.otpForm.value.otp;
      const email = this.loginForm.value.email;
      this.authService.verifyOTP(email, otp).subscribe(
        (success) => {
          if (success) {
            this.dialog.closeAll();
            this.router.navigate(['/home']);
          }
        },
        (error) => {
          this.errorMessage = 'Código de Verificação Inválido';
        },
      );
    }
  }

  onGenerateTOTP(email: string) {
    this.authService.generateTOTP(email).subscribe({
      next: (response: any) => {
        if (response) {
          const uri =
            typeof response === 'string'
              ? response
              : response.totp_uri || response.uri;
          this.qrCodeUrl =
            'https://api.qrserver.com/v1/create-qr-code/?data=' +
            encodeURIComponent(uri);
        }
      },
      error: (err) => console.error('Erro ao gerar TOTP:', err),
    });
  }
}
