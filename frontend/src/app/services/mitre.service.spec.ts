import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing'; // Importa o HttpClientTestingModule
import { MitreService } from './mitre.service';

describe('MitreService', () => {
  let service: MitreService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule], // Importa o HttpClientTestingModule aqui
      providers: [MitreService]
    });
    service = TestBed.inject(MitreService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
