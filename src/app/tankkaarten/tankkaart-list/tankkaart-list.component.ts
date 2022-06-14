import { AfterViewInit, Input, Component, ViewChild } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { DataExchangeService } from '../../data-exchange.service';
import { DatastreamService } from '../../datastream.service';
import { ITankkaart } from "../../objects/iTankkaart";
import { TankkaartDetailDialogComponent } from "../tankkaart-detail-dialog/tankkaart-detail-dialog.component";

@Component({
  selector: 'app-tankkaart-list',
  templateUrl: './tankkaart-list.component.html',
  styleUrls: ['./tankkaart-list.component.css']
})
export class TankkaartListComponent implements AfterViewInit {

  @Input() columnsToDisplay: any;
  @ViewChild(MatPaginator) paging!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  dataSource: MatTableDataSource<any> = new MatTableDataSource();

  entityType: string = 'tankkaart';
  tableData: Array<any> = new Array<any>();
  selectedTankkaart: any;

  constructor(private datastream: DatastreamService, private dataService: DataExchangeService, private dialog: MatDialog) { }

  ngAfterViewInit() {

    // data voor de tabel wordt binnengehaald en in tabelvorm gegoten.
    // - brandstoffenForView wordt opgebouwd: comma separated list van type brandstoffen
    // - geldigheidsdatum wordt meegegeven aan de sort.
    this.datastream.GetAllFuelCards().subscribe((data: any) => {
      data.forEach((tankkaart: ITankkaart) => {
        let stringbuilder = "";
        tankkaart.mogelijkeBrandstoffen.forEach((mb: any) => {
          const { typeBrandstof } = mb.brandstof;
          stringbuilder = stringbuilder.concat(typeBrandstof, ", ");
        });
        tankkaart = tankkaart as ITankkaart;
        tankkaart.brandstoffenForView = stringbuilder.slice(0, - 2);
      });
      this.tableData = data;
      this.dataSource.data = this.tableData;
      this.dataSource.paginator = this.paging;
      this.dataSource.sort = this.sort;
      this.dataSource.sortingDataAccessor = (item, property) => {
        switch (property) {
          case 'geldigheidsdatum': return new Date(item.geldigheidsDatum);
          default: return item[property];
        }
      };
    });

    // haalt de entiteit voor modificatie van de tabel binnen en kijkt welke bewerking op de tabel dient te worden uitgevoerd.
    // Hiervoor wordt gebruik gemaakt van de DataExchangeService.
    this.dataService.observableData.subscribe((data: any) => {
      console.log("sent data: ", data);
      if (data) {
        if (data.value) {
          if (data.entity == "tankkaart") {
            if (data.action == "add") {
              if (data.value) {
                this.tableData.unshift(data.value);
              }
            }
            if (data.action == "delete") {
              if (data.value) {
                let index = this.tableData.findIndex(t => t.kaartnummer == data.value.kaartnummer);
                this.tableData.splice(index, 1);
              }
            }
            this.dataSource.data = this.tableData;
          }
        }
      }
    });
  }

  //behandelt de algemene filtering komend van de searchbar;
  FilterDataHandler(filter: any): void {
    this.dataSource = filter;
  }

  //opent de tankkaart-detail-dialog met settings voor viewing.
  //Bij het sluiten van de dialog wordt de data in de tabel bijgewerkt via de dataexchangeservice.
  //Ook hier wordt de brandstoffenForView opgebouwd
  ViewDetails = (selectedRow: ITankkaart) => {
    const config = new MatDialogConfig();
    this.selectedTankkaart = selectedRow;

    if (this.selectedTankkaart.koppeling) {
      this.datastream.GetSingleDriver(this.selectedTankkaart.koppeling.rijksregisternummer).subscribe((data: any) => {

        config.autoFocus = true;
        config.data = {
          modifiable: false,
          entity: selectedRow,
          bestuurderLink: data
        };

        let dialogRef = this.dialog.open(TankkaartDetailDialogComponent, config);

        dialogRef.afterClosed().subscribe((data: any) => {
          if (data) {
            this.tableData.forEach((element, index) => {
              if (element.kaartnummer == data.kaartnummer) {
                let stringbuilder = "";
                data.mogelijkeBrandstoffen.forEach((mb: any) => {
                  const { typeBrandstof } = mb.brandstof;
                  stringbuilder = stringbuilder.concat(typeBrandstof, ", ");
                });
                data.brandstoffenForView = stringbuilder.slice(0, - 2);
                this.tableData[index] = data;
              }
            });

            this.dataSource.data = this.tableData;
          }
        });
      });
    }
    else {
      config.autoFocus = true;
      config.data = {
        modifiable: false,
        entity: selectedRow
      };

      let dialogRef = this.dialog.open(TankkaartDetailDialogComponent, config);

      dialogRef.afterClosed().subscribe((data: any) => {
        if (data) {
          this.tableData.forEach((element, index) => {
            if (element.kaartnummer == data.kaartnummer) {
              let stringbuilder = "";
              data.mogelijkeBrandstoffen.forEach((mb: any) => {
                const { typeBrandstof } = mb.brandstof;
                stringbuilder = stringbuilder.concat(typeBrandstof, ", ");
              });
              data.brandstoffenForView = stringbuilder.slice(0, - 2);
              this.tableData[index] = data;
            }
          });

          this.dataSource.data = this.tableData;
        }
      });
    }
  }
}
