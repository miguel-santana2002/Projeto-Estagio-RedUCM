import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { HeaderComponent } from "../../layout/header/header.component";
import { TitlebannerComponent } from "../../layout/titlebanner/titlebanner.component";
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-update-user',
    standalone: true,
    templateUrl: './update-user.component.html',
    styleUrl: './update-user.component.css',
    imports: [HeaderComponent, TitlebannerComponent, ReactiveFormsModule, CommonModule, FormsModule]
})
export class UpdateUserComponent implements OnInit {

  constructor(private authService: AuthService, private router: Router, private route: ActivatedRoute) { }
  isAdminSelected: boolean = true;

  trueIsAdminSelected() {
      this.isAdminSelected = true;
      this.updateUserForm.get('companies')?.disable();
      this.updateUserForm.get('companies')?.clearValidators();
      this.updateUserForm.get('companies')?.updateValueAndValidity();
      this.updateUserForm.get('companies')?.setValue(null);
  }

  falseIsAdminSelected() {
      this.isAdminSelected = false;
      this.updateUserForm.get('companies')?.enable();
      this.updateUserForm.get('companies')?.setValidators(Validators.required);
      this.updateUserForm.get('companies')?.updateValueAndValidity();
      
  }

  clients: any = [];
  clientNames: any = [];
  userId: string = '';

  isChangePasswordModalOpen: boolean = false; 
  changePasswordForm: FormGroup = new FormGroup({}); 

confirmPassword: any;
newPassword: any;
  ngOnInit() {

    this.changePasswordForm = new FormGroup({
        newPassword: new FormControl('', [Validators.required]),
        confirmPassword: new FormControl('', [Validators.required])
      },);

      
      this.updateUserForm.get('companies')?.disable();

      this.route.params.subscribe(params => {
          this.userId = params['id'];
          this.loadUserData(this.userId);
      });

      this.authService.getClients().subscribe((data: any) => {
          this.clients = data;
          this.clientNames = this.clients.map((client: any) => client.name);
      });
  }

  user: any = {
      username: "",
      companies: "",
      email: "",
  };

  updateUserForm = new FormGroup({
      username: new FormControl("", [Validators.required]),
      companies: new FormControl({ value: "", disabled: true }),
      email: new FormControl("", [Validators.required, Validators.email]),
      otpMethod: new FormControl("")
  });

  get username() {
      return this.updateUserForm.get('username');
  }

  get companies() {
      return this.updateUserForm.get('companies');
  }

  get email() {
      return this.updateUserForm.get('email');
  }

    get otpMethod() {
        return this.updateUserForm.get('otpMethod');
    }


    openChangePasswordModal() {
        this.isChangePasswordModalOpen = true;
      }

      closeChangePasswordModal() {
        this.isChangePasswordModalOpen = false;
      }
    
      passwordsMatch(): boolean {
        const newPassword = this.changePasswordForm.get('newPassword')?.value;
        const confirmPassword = this.changePasswordForm.get('confirmPassword')?.value;
        return newPassword === confirmPassword;
      }
    
    
      changePassword() {
        const newPassword = this.changePasswordForm.get('newPassword')?.value;
    
        this.authService.changePassword(this.userId,newPassword).subscribe(
          response => {
            console.log(response);
            this.closeChangePasswordModal();
          },
          error => {
            console.error(error);
          }
        );
    }
          

  loadUserData(userId: string) {
      this.authService.getUsers().subscribe((data: any) => {
          const user = data.find((u: any) => u.pk == userId);

          if (user) {
              this.user = user;
              this.updateUserForm.patchValue({
                  username: this.user.username,
                  companies: this.user.companies,
                  email: this.user.email
              });
              this.isAdminSelected = this.user.companies?.length === 0;
              if (this.isAdminSelected) {
                  this.trueIsAdminSelected();
              } else {
                  this.falseIsAdminSelected();
              }
          }
      });
  }

  updateUser() {
      const userData = {
          username: this.username!.value!,
          companies: this.companies!.value!,
          email: this.email!.value!,
          otpMethod: this.otpMethod!.value!
      };
console.log(userData)
     this.authService.updateUserInfo(userData, this.userId).subscribe((response: any) => {
         this.router.navigate(['/manage-users']);
     });
  }
}