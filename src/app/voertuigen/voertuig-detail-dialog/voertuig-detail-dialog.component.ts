import { Component, Directive, ElementRef, Inject, OnInit, ViewChild } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { DatastreamService } from '../../datastream.service';
import { FormGroup, FormControl, Validators } from '@angular/forms'
import { Voertuig } from '../../objects/voertuig';
import { IVoertuig } from '../../objects/iVoertuig';
import { DataExchangeService } from '../../data-exchange.service';


@Component({
  selector: 'app-voertuig-detail-dialog',
  templateUrl: './voertuig-detail-dialog.component.html',
  styleUrls: ['./voertuig-detail-dialog.component.css']
})

export class VoertuigDetailDialogComponent implements OnInit {

  // class in htmlcode voor het omschrijven van gebeurtenissen
  @ViewChild('message', { static: false}) message!: ElementRef;

  modifiable: boolean = true;
  forCreation: boolean = true;
  notEditable!: string;
  viewOnly!: string;
  voertuig = new Voertuig();

  categories: any;
  brandstoffen: any;
  statussen: any;
  unlinkedBestuurders: any;
  bestuurderLink: any = null;


  brandstof={
    id: "",
    typeBrandstof: ""
  };
  categorie={
    id: "",
    typeWagen: ""
  };
  status={
    id: "",
    staat: ""
  };

  // deze Formgroep behandelt de validatie en controls van de inputs en selects. Bij objecten is het raadzaam deze te flattenen of enkel
  // de benodigde properties weer te geven. Later worden deze terug omgezet in objecten. zie function: CreateObjectToSend
  voertuigForm = new FormGroup({
    chassisnummer: new FormControl('',[Validators.required, Validators.pattern("[A-Ha-hJ-Nj-nPR-Zr-z0-9]{13}[0-9]{4}")]),
    merk: new FormControl('',[Validators.required]),
    model: new FormControl('',[Validators.required]),
    nummerplaat: new FormControl('',[Validators.pattern("([1-9O-Zo-z])?[-|\s]?([a-zA-Z]{3})[-|\s]([0-9]{3})|([1-9O-Zo-z])?([a-zA-Z]{3})([0-9]{3})")]),
    bouwjaar: new FormControl(new Date().getFullYear(), [Validators.max( new Date().getFullYear()), Validators.min(1886)]),
    aantalDeuren: new FormControl( 5 , [Validators.min(0)]),
    kleur: new FormControl(''),
    typeBrandstof: new FormControl('',[Validators.required]),
    typeWagen: new FormControl('',[Validators.required]),
    staat: new FormControl('')
  });

  constructor(private datastream: DatastreamService, private dialogRef: MatDialogRef<VoertuigDetailDialogComponent>, private dataService: DataExchangeService, @Inject(MAT_DIALOG_DATA) private data: any) {
    this.voertuig = data.entity;
    this.modifiable = data.modifiable;
  }

  ngOnInit(): void {

    if(this.voertuig){
      this.patchObjectToForm(this.voertuig);
    };

    // zet de mode waarin de dialog zich op dit moment bevindt. de mogelijkheden zijn: view, add en edit. de mode wordt weergegeven
    // in de MAT_DIALOG_DATA bij opening van de dialog.
    this.IsModifiable(this.modifiable);

    this.datastream.GetCategories().subscribe((data: any) => {
      this.categories = data;
    });

    this.datastream.GetFuels().subscribe((data: any) => {
      this.brandstoffen = data;
    });

    this.datastream.GetStatusses().subscribe((data: any) => {
      this.statussen = data;
    });

    this.datastream.GetAllBestuurders().subscribe((data: any) =>{
      this.unlinkedBestuurders = data.filter((u: any) => u.koppeling.chassisnummer == null || u.koppeling.chassisnummer == this.voertuig.chassisnummer);
      if(this.voertuig){
        if(this.voertuig.koppeling){
          let link = data.filter((u: any) => u.koppeling.chassisnummer == this.voertuig.chassisnummer);
          this.bestuurderLink = link[0];
        }
      }
    });

    this.dialogRef.backdropClick().subscribe(() => {
        this.dialogRef.close(this.voertuig);
    });
  }

  //Omvat de creatie van het te verzenden object en de wissel van mode "add" naar "view" + errorbehandeling.
  onSubmit = () => {

    let vehicle = this.CreateObjectToSend();

    this.datastream.PostVehicle(vehicle).subscribe( (res: any) =>{

      if(res){
        this.voertuig = res;
      }
    }, error => {
      this.message.nativeElement.innerHTML = error.error;
    }, () => {
      this.IsModifiable(false);
      let success = 'nieuw voertuig met chassisnummer "' + this.voertuig.chassisnummer +'" is successvol toegevoegd aan de database.';
      this.message.nativeElement.innerHTML = success;
      }
    );
  }

  openUpdateScreen = () => {
    this.forCreation = false;
    this.IsModifiable(true);
    this.notEditable = "changeColor";
    this.viewOnly = "";
  }

  onSelectionChange = (event: any) => {
    let link = this.unlinkedBestuurders.filter((u: any) => u.rijksregisternummer == event);
    this.bestuurderLink = link[0];
  }

  //To Do route naar bestuurders en open daar automatisch met het behavioursubject de detail dialog voor de meegegeven bestuurder.
  OpenBestuurdersDetails = () => {
    this.dataService.follow("view bestuurder");
    this.dataService.sendData("view bestuurder", this.bestuurderLink);
  }

  onSave = () => {
    let vehicle = this.CreateObjectToSend();

    this.datastream.UpdateVehicle(vehicle).subscribe( (res: any) =>{

      if(res){
        this.voertuig = res;
        this.patchObjectToForm(res);
      }
    }, error => {
      this.message.nativeElement.innerHTML = error.error;
    }, () => {
      this.IsModifiable(false);
      let success = 'voertuig met chassisnummer "' + this.voertuig.chassisnummer +'" is geupdate';
      this.message.nativeElement.innerHTML = success;
      }
    );
  }
  linkUnlinkDriver = () =>{
    console.log("link/unlink: ");
    console.log(this.bestuurderLink);
    if(this.bestuurderLink){
      if(this.voertuig.koppeling){
        console.log("unlink koppeling: ", this.voertuig.koppeling);
        this.datastream.UnlinkVehicle(this.voertuig.chassisnummer).subscribe(() =>{

          this.voertuig.koppeling = null;
          console.log("unlink: ", this.bestuurderLink);

        }, error =>{
          if(error){
            this.message.nativeElement.innerHTML = error.message;
          }
        }, () =>{
          let success = this.bestuurderLink.naam + " " + this.bestuurderLink.achternaam + " is ontkoppeld van het voertuig";
          this.message.nativeElement.innerHTML = success;
        }
        );
      }
      else{
        this.datastream.LinkVehicle(this.bestuurderLink.rijksregisternummer, this.voertuig.chassisnummer).subscribe(() =>{

        }, error =>{
          if(error){
            this.message.nativeElement.innerHTML = error.message;
          }
        }, () =>{
          let success = this.bestuurderLink.naam + " " + this.bestuurderLink.achternaam + " is nu gekoppeld aan het voertuig";
          this.message.nativeElement.innerHTML = success;

          this.datastream.GetSingleVehicle(this.voertuig.chassisnummer).subscribe((res: any) =>{
            if(res){
              this.voertuig = res;
            }
            else{
              this.message.nativeElement.innerHTML = "Error: Voertuig onbekend in de database";
            }
          });
        }
        );
      }
    }
  }

  //behandelt de mode waarin de dialog zich bevindt.
  IsModifiable = (ismodifiable: boolean) =>{
    this.modifiable = ismodifiable
    if(!ismodifiable){
      this.forCreation = false;
      this.notEditable = "changeColor";
      this.viewOnly ="changeColor";
    }
  }

   //indien een voertuig is meegegeven wordt deze via deze method gepatched met de voertuigForm.
    //De niet gepatchede controls worden handmatig ingegeven.
  patchObjectToForm = (entity: Voertuig) =>{
    this.voertuigForm.patchValue(this.voertuig);
    this.voertuigForm.controls["typeBrandstof"].setValue(this.voertuig.brandstof.typeBrandstof);
    this.voertuigForm.controls["typeWagen"].setValue(this.voertuig.categorie.typeWagen);
    if(this.voertuig.status)
      this.voertuigForm.controls["staat"].setValue(this.voertuig.status.staat);
  }

  CreateObjectToSend =(): IVoertuig => {
    let vehicle = new Voertuig;

    // Elke property dient meegegeven te worden aan de api, null waardes voor getallen en strings kunnen niet verwerkt worden.
    if(!this.voertuigForm.controls["nummerplaat"].value){
      if(this.voertuigForm.controls["staat"].value != "aankoop"){
        this.message.nativeElement.innerHTML = "error: Indien het voertuig niet de status 'aankoop' heeft, dient men een nummerplaat mee te geven";
      }
      else{
        this.voertuigForm.controls["nummerplaat"].setValue("");
      }
    }

    if(!this.voertuigForm.controls["aantalDeuren"].value){
      this.voertuigForm.controls["aantalDeuren"].setValue(0);
    }

    if(!this.voertuigForm.controls["kleur"].value){
      this.voertuigForm.controls["kleur"].setValue("");
    }

    if(!this.voertuigForm.controls["staat"].value){
      this.voertuigForm.controls["staat"].setValue("in bedrijf");
    }

    vehicle.chassisnummer = this.voertuigForm.controls["chassisnummer"].value;
    vehicle.model = this.voertuigForm.controls["model"].value;
    vehicle.merk = this.voertuigForm.controls["merk"].value;
    vehicle.model = this.voertuigForm.controls["model"].value;
    vehicle.bouwjaar = this.voertuigForm.controls["bouwjaar"].value;
    vehicle.nummerplaat = this.voertuigForm.controls["nummerplaat"].value;
    vehicle.aantalDeuren = this.voertuigForm.controls["aantalDeuren"].value;
    vehicle.kleur = this.voertuigForm.controls["kleur"].value;
    vehicle.brandstof = this.brandstoffen.find((v: any) => v.typeBrandstof == this.voertuigForm.controls["typeBrandstof"].value);
    vehicle.categorie = this.categories.find((v: any) => v.typeWagen == this.voertuigForm.controls["typeWagen"].value);
    vehicle.status = this.statussen.find((v: any) => v.staat == this.voertuigForm.controls["staat"].value);

    return vehicle;
  }
}
