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
    CommonModule
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

  constructor(private authService: AuthService, private router: Router, public dialog: MatDialog) {
    this.loginForm = new FormGroup({
      email: new FormControl('', [Validators.required, Validators.email]),
      password: new FormControl('', Validators.required),
    });

    this.otpForm = new FormGroup({
      otp: new FormControl('', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]),
    });
  }

errorMessage = '';


  onSubmit() {
    if (this.loginForm.valid) {
      const { email, password } = this.loginForm.value;
      this.authService.login(email, password).subscribe((response) => {
        console.log(response);
        this.errorMessage = '';  
        if (response.otpSent) {
          this.otpMethod = response.otpMethod!;
          this.showOtpForm = true;

          if (this.otpMethod === 'totp'){
            this.onGenerateTOTP();
          }
        } else {
          console.log('OTP not sent');
          this.router.navigate(['/home']);
        }
      },
      (error) => {
       this.errorMessage = 'Credenciais inválidas para início de sessão';  // Add this line
        
      });
    }
  }
  

  onVerifyOtp() {
    if (this.otpForm.valid) {
      const otp = this.otpForm.value.otp;
      const email = this.loginForm.value.email;
      this.authService.verifyOTP(email, otp).subscribe((success) => {
        if (success) {
          this.dialog.closeAll();
          this.router.navigate(['/home']);
        } 
      },
      (error) => {
        this.errorMessage = 'Código de Verificação Inválido';  // Add this line
      });
    }
  }
  onGenerateTOTP() {
    this.authService.generateTOTP().subscribe((response) => {
      console.log(response);
        if (response ) {
            this.qrCodeUrl = 'https://api.qrserver.com/v1/create-qr-code/?data=' + encodeURIComponent(response);

        }
    });
}

}
