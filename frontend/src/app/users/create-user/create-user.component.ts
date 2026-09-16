import { Component, OnInit } from '@angular/core';
import { HeaderComponent } from "../../layout/header/header.component";
import { TitlebannerComponent } from "../../layout/titlebanner/titlebanner.component";
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

@Component({
    selector: 'app-create-user',
    standalone: true,
    templateUrl: './create-user.component.html',
    styleUrls: ['./create-user.component.css'],
    imports: [HeaderComponent, TitlebannerComponent, CommonModule, ReactiveFormsModule, FormsModule]
})
export class CreateUserComponent implements OnInit {

    constructor(private authService: AuthService, private router: Router) { }
    isAdminSelected: boolean = true;

    trueIsAdminSelected() {
        this.isAdminSelected = true;
        this.createUserForm.get('companies')?.disable();
        this.createUserForm.get('companies')?.clearValidators();
        this.createUserForm.get('companies')?.updateValueAndValidity();
    }

    falseIsAdminSelected() {
        this.isAdminSelected = false;
        this.createUserForm.get('companies')?.enable();
        this.createUserForm.get('companies')?.setValidators(Validators.required);
        this.createUserForm.get('companies')?.updateValueAndValidity();
    }

    selectedOtpMethod: string = "email";
    clients: any = [];
    clientNames: any = [];
    ngOnInit() {
        this.createUserForm.get('companies')?.disable();

        this.authService.getClients().subscribe((data: any) => {
            this.clients = data;
            this.clientNames = this.clients.map((client: any) => client.name);
        });
    }

    user: any = {
        username: "",
        companies: "",
        email: "",
        password: ""
    };

    createUserForm = new FormGroup({
        username: new FormControl("", [Validators.required]),
        companies: new FormControl({ value: "", disabled: true }),
        email: new FormControl("", [Validators.required, Validators.email]),
        password: new FormControl("", [Validators.required, Validators.minLength(6)]),
        otpMethod: new FormControl("email")
    });

    get username() {
        return this.createUserForm.get('username');
    }

    get companies() {
        return this.createUserForm.get('companies');
    }

    get email() {
        return this.createUserForm.get('email');
    }

    get password() {
        return this.createUserForm.get('password');
    }

    get otpMethod() {
        return this.createUserForm.get('otpMethod');
    }

    createUser() {
        
        const userData = {
            username: this.username!.value!,
            companies: this.companies!.value!,
            email: this.email!.value!,
            password: this.password!.value!,
            otpMethod : this.otpMethod!.value!
        };

        console.log("AASHIDHA");
        console.log(userData);

        this.authService.createUser(userData).subscribe((response) => {
            console.log(response);
            this.router.navigate(['/manage-users']);
        });
    }
}
