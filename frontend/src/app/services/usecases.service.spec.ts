import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing'; // Importa o HttpClientTestingModule
import { UsecasesService } from './usecases.service';

describe('UsecasesService', () => {
  let service: UsecasesService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [UsecasesService]
    });
    service = TestBed.inject(UsecasesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
