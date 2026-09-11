
import { Component, ElementRef, ViewChild } from '@angular/core';
import { HeaderComponent } from "../../layout/header/header.component";
import { TitlebannerComponent } from "../../layout/titlebanner/titlebanner.component";
import { ActivatedRoute } from '@angular/router';
import { UsecasesService } from '../../services/usecases.service';
import { CommonModule, DecimalPipe } from '@angular/common';
import { Modal, initFlowbite } from 'flowbite';
import { MitreService } from '../../services/mitre.service';

@Component({
    selector: 'app-technique-details',
    standalone: true,
    templateUrl: './technique-details.component.html',
    styleUrl: './technique-details.component.css',
    imports: [HeaderComponent, TitlebannerComponent, DecimalPipe, CommonModule]
})
export class TechniqueDetailsComponent {

  
      techniqueToDetail: any = {
          title: "",
          cncs: "",
          tactics: [] as string[],
          description: "",
          mitigations: [] as string[],
          components: [] as string[],
          datasources: [] as string[],
          url: "",
          subtechniques: [] as string[],
          platforms: [] as string[],
  
      };

      id : string = this.route.snapshot.params['id'];


  
      detection = [] as any;
  
      constructor(private route: ActivatedRoute, private usecasesService: UsecasesService, private mitreService : MitreService) { }
  
      ngOnInit() {


        this.mitreService.getTechniqueById(this.id).subscribe((data) => {
          console.log(data);
          this.techniqueToDetail.title = data.name;
          this.techniqueToDetail.description = data.description;

          //select the tactics in the multiple select
          this.techniqueToDetail.tactics = data.tactics;

          this.techniqueToDetail.cncs = "";

          this.techniqueToDetail.components = [];
          this.techniqueToDetail.datasources = [];

          this.techniqueToDetail.url = data.url;
          this.techniqueToDetail.subtechniques = data.sub_techniques;
          this.techniqueToDetail.platforms = data.platforms;

          this.mitreService.getMitigationsByTechniqueId(this.id).subscribe((data) => {
            this.techniqueToDetail.mitigations = data;
            

            this.mitreService.getComponentsByTechniqueId(this.id).subscribe((data) => {

              this.techniqueToDetail.components = data;

                    this.mitreService.getDatasourcesByTechniqueId(this.id).subscribe((data) => {

                      this.techniqueToDetail.datasources = data;
                 

          
         console.log(this.techniqueToDetail);

        this.getDetection();

         

          
      });
  });
});
});
}





getDetection() {


  // Loop pelos componentes do caso de uso
  for (let i = 0; i < this.techniqueToDetail.components.length; i++) {
      const component = this.techniqueToDetail.components[i];
  
      // Verifica se o nome do componente está presente nas fontes de dados
      for (let j = 0; j < this.techniqueToDetail.datasources.length; j++) {
          const datasource = this.techniqueToDetail.datasources[j];
  
  
          if (datasource.components.includes(component.name)) {
              this.detection.push({
                  datasourceName: datasource.name,
                  datasourceDescription: datasource.description,
                  componentName: component.name,
                  componentDescription: component.description
              });
          }
      }
  }
  
  console.log("aqui");
  console.log(this.detection);
  
      }
  
  
  
    
    





}

  
  
  


  
    
  
    
  
