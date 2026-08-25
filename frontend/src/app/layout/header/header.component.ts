import { Component, Input } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { initFlowbite } from 'flowbite';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {
  private authService: AuthService;
  user : any = { username: "", companies: [] };


  logout() {
    this.authService.logout();
    this.router.navigate(['/']);
  }
  
  constructor(authService: AuthService, private router : Router) {
    this.authService = authService;
  }

  
  ngOnInit() {

   
    initFlowbite();
    this.authService.loggedInInfo().subscribe((value) => {
      console.log(value);
     this.user = value;
      if (this.user.companies == null) {
        this.user.companies = [];
      }

      console.log(this.user);
    });
  }
}
