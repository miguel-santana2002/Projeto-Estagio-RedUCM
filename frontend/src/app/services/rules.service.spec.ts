import { TestBed } from '@angular/core/testing';

import { RulesService } from './rules.service';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

describe('RulesService', () => {
  let service: RulesService;
  var httpMock: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [RulesService]
    });
    service = TestBed.inject(RulesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify(); // Verifica se não há requisições pendentes
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
