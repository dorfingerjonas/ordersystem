"use strict";(self.webpackChunkordersystem=self.webpackChunkordersystem||[]).push([[65],{9065:(J,f,c)=>{c.r(f),c.d(f,{PayModule:()=>A});var p=c(177),t=c(7705),g=c(1359),_=c(8490),b=c(7038),u=c(6600),h=c(52);function P(n,s){1&n&&(t.j41(0,"span",5),t.EFF(1,"Keine offenen Tische"),t.k0s())}function I(n,s){if(1&n&&(t.j41(0,"span",6),t.EFF(1),t.k0s()),2&n){const e=s.$implicit;t.Mz_("routerLink","/pay/cart/",e.nr,""),t.R7$(1),t.JRh(e.nr)}}let v=(()=>{class n{constructor(e,i,o){this.header=e,this.data=i,this.loading=o,this.orders=null,this.data.fetchData(),this.loading.activateLoading()}ngOnInit(){setTimeout(()=>this.header.text="Bezahlen"),this.data.openOrders.subscribe(e=>{this.orders=e,this.loading.deactivateLoading()})}static{this.\u0275fac=function(i){return new(i||n)(t.rXU(g.d),t.rXU(_.u),t.rXU(b.U))}}static{this.\u0275cmp=t.VBU({type:n,selectors:[["app-pay-tables"]],decls:7,vars:2,consts:[["id","table-wrapper"],["routerLink","/pay/cart",1,"table","wide"],["id","category-header"],["class","error",4,"ngIf"],["class","table","matRipple","",3,"routerLink",4,"ngFor","ngForOf"],[1,"error"],["matRipple","",1,"table",3,"routerLink"]],template:function(i,o){1&i&&(t.j41(0,"div",0)(1,"span",1),t.EFF(2,"ohne Tisch kassieren"),t.k0s(),t.j41(3,"p",2),t.EFF(4,"offene Tische"),t.k0s(),t.DNE(5,P,2,0,"span",3),t.DNE(6,I,2,2,"span",4),t.k0s()),2&i&&(t.R7$(5),t.Y8G("ngIf",0===(null==o.orders?null:o.orders.length)),t.R7$(1),t.Y8G("ngForOf",o.orders))},dependencies:[p.Sq,p.bT,u.r6,h.Wk],styles:["[_nghost-%COMP%]{width:100%;display:flex;padding-bottom:20%;justify-content:center}#table-wrapper[_ngcontent-%COMP%]{width:88%;display:flex;flex-wrap:wrap;align-items:flex-start}#table-wrapper[_ngcontent-%COMP%]   .table[_ngcontent-%COMP%]{width:20vw;height:20vw;margin:1vw;display:flex;justify-content:center;align-items:center;background:#dbdbdb;cursor:pointer;border-radius:15px;transition:.2s ease-in-out background;-webkit-user-select:none;user-select:none;outline:none;font-size:8vw;font-weight:500}#table-wrapper[_ngcontent-%COMP%]   .table.wide[_ngcontent-%COMP%]{width:100%;font-size:5vw;height:15vw}#table-wrapper[_ngcontent-%COMP%]   .table[_ngcontent-%COMP%]:hover{background:rgba(252,207,137,.68)}#table-wrapper[_ngcontent-%COMP%]   #category-header[_ngcontent-%COMP%]{width:100%;outline:none;font-size:4vw;font-weight:500}"]})}}return n})();var O=c(467),k=c(5416),D=c(4449),T=c(2102);function x(n,s){1&n&&(t.j41(0,"span",12),t.EFF(1,"offene Getr\xe4nke und Speisen"),t.k0s())}function F(n,s){if(1&n){const e=t.RV6();t.j41(0,"div",16),t.bIt("click",function(){const a=t.eBV(e).$implicit,l=t.XpG(2);return t.Njj(l.selectOpenItem(a.id))}),t.j41(1,"span",17),t.EFF(2),t.k0s(),t.j41(3,"span",18),t.EFF(4),t.k0s(),t.j41(5,"span",19),t.EFF(6),t.k0s()()}if(2&n){const e=s.$implicit,i=t.XpG(2);t.R7$(2),t.JRh(e.amount),t.R7$(2),t.JRh(e.name),t.R7$(2),t.SpI("",i.formatPrice(e.price),"\u20ac")}}function E(n,s){1&n&&(t.j41(0,"mat-error"),t.EFF(1," Keine offenen Positionen auf diesem Tisch "),t.k0s())}function w(n,s){if(1&n&&(t.j41(0,"div",13),t.DNE(1,F,7,3,"div",14),t.DNE(2,E,2,0,"mat-error",15),t.k0s()),2&n){const e=t.XpG();t.R7$(1),t.Y8G("ngForOf",e.getAccumulatedOpenItems(e.openItems)),t.R7$(1),t.Y8G("ngIf",0===e.getAccumulatedOpenItems(e.openItems).length)}}function G(n,s){1&n&&(t.j41(0,"span",20),t.EFF(1,"Alle Getr\xe4nke und Speisen"),t.k0s())}function M(n,s){if(1&n){const e=t.RV6();t.j41(0,"app-order-category",21),t.bIt("itemsChange",function(o){t.eBV(e);const a=t.XpG();return t.Njj(a.alcoholDrinks=o)}),t.k0s()}if(2&n){const e=t.XpG();t.Y8G("items",e.alcoholDrinks)}}function j(n,s){if(1&n){const e=t.RV6();t.j41(0,"app-order-category",22),t.bIt("itemsChange",function(o){t.eBV(e);const a=t.XpG();return t.Njj(a.antiDrinks=o)}),t.k0s()}if(2&n){const e=t.XpG();t.Y8G("items",e.antiDrinks)}}function R(n,s){if(1&n){const e=t.RV6();t.j41(0,"app-order-category",23),t.bIt("itemsChange",function(o){t.eBV(e);const a=t.XpG();return t.Njj(a.food=o)}),t.k0s()}if(2&n){const e=t.XpG();t.Y8G("items",e.food)}}function N(n,s){if(1&n&&(t.j41(0,"div",24)(1,"span"),t.EFF(2),t.k0s()()),2&n){const e=s.$implicit,i=t.XpG();t.R7$(2),t.E5c("",e.amount," x ",e.name," (",i.formatPrice(e.price),"\u20ac)")}}function $(n,s){if(1&n&&(t.j41(0,"div",24)(1,"span"),t.EFF(2),t.k0s()()),2&n){const e=s.$implicit,i=t.XpG();t.R7$(2),t.E5c("",e.amount," x ",e.name," (",i.formatPrice(e.price),"\u20ac)")}}function X(n,s){1&n&&(t.j41(0,"span",25),t.EFF(1,"Der Warenkorb ist leer"),t.k0s())}function S(n,s){if(1&n&&(t.j41(0,"span",26),t.EFF(1),t.k0s()),2&n){const e=t.XpG();let i;t.R7$(1),t.SpI("Summe: ",e.formatPrice((null==(i=e.getCartSummary())?null:i.sum)||0),"\u20ac")}}function Y(n,s){if(1&n){const e=t.RV6();t.j41(0,"button",27),t.bIt("click",function(){t.eBV(e);const o=t.XpG();return t.Njj(o.complete())}),t.EFF(1,"Bezahlvorgang abschlie\xdfen "),t.k0s()}}let C=(()=>{class n{constructor(e,i,o,a){this.header=e,this.data=i,this.route=o,this.snackBar=a,this.selectedTableNr=this.route.snapshot.paramMap.get("tableNr"),this.header.text=this.selectedTableNr?`Tisch ${this.selectedTableNr} kassieren`:"Kassieren",this.data.fetchData(),this.alcoholDrinks=null,this.antiDrinks=null,this.food=null,this.openItems=null,this.tableOpenItems=null,this.data.food.subscribe(l=>{this.food=l.map(r=>({...r,amount:0}))}),this.data.drinks.subscribe(l=>{this.alcoholDrinks=[],this.antiDrinks=[];for(const r of l)if("alcohol"===r.category)this.alcoholDrinks.push({...r,amount:0});else{if("anti"!==r.category)throw new Error("Invalid Drink category "+r.category);this.antiDrinks.push({...r,amount:0})}}),this.selectedTableNr&&this.data.openOrders.subscribe(l=>{if(!this.food||!this.antiDrinks||!this.alcoholDrinks)return;const r=l.findIndex(d=>d.nr===this.selectedTableNr);if(-1===r)return;const m=l[r].openItems;this.tableOpenItems=m,this.openItems=[],m.forEach(d=>{const y=[...this.food,...this.alcoholDrinks,...this.antiDrinks].find(L=>L.id===d.itemId);y&&this.openItems?.push({...y,amount:d.amount})})})}getCartSummary(){if(null===this.antiDrinks||null===this.alcoholDrinks||null===this.food)return null;const e={drinks:[...this.alcoholDrinks.filter(i=>(i.amount||0)>0),...this.antiDrinks.filter(i=>(i.amount||0)>0)],food:this.food.filter(i=>(i.amount||0)>0),sum:0};return e.sum=[...e.drinks,...e.food].reduce((i,o)=>i+(o.amount||0)*o.price,0),e}formatPrice(e){return e.toString().replace(".",",")}reset(){this.food?.forEach(e=>e.amount=0),this.alcoholDrinks?.forEach(e=>e.amount=0),this.antiDrinks?.forEach(e=>e.amount=0),document.getElementsByClassName("page-container")[0].scrollTop=0}getAccumulatedOpenItems(e){const i=[];return e?(e.forEach(o=>{if((o.amount||0)<=0)return;const a=i.findIndex(l=>l.id===o.id);-1!==a&&i[a].amount?i[a].amount+=o.amount||0:i.push({...o})}),i.sort((o,a)=>o.name.localeCompare(a.name))):i}selectOpenItem(e){if(!(this.openItems&&this.antiDrinks&&this.alcoholDrinks&&this.food&&this.tableOpenItems))return;const i=this.openItems.findIndex(a=>a.id===e&&(a.amount||0)>0);if(-1===i)return;this.openItems[i].amount--;let o=this.food.findIndex(a=>a.id===e);-1===o?(o=this.alcoholDrinks.findIndex(a=>a.id===e),-1===o?(o=this.antiDrinks.findIndex(a=>a.id===e),-1===o||this.antiDrinks[o].amount++):this.alcoholDrinks[o].amount++):this.food[o].amount++}complete(){var e=this;return(0,O.A)(function*(){if(!(e.openItems&&e.antiDrinks&&e.alcoholDrinks&&e.food&&e.tableOpenItems&&e.selectedTableNr))return;const i=[],o=[...e.food,...e.antiDrinks,...e.alcoholDrinks];e.tableOpenItems.forEach(a=>{const l=o.findIndex(r=>r.id===a.itemId);-1!==l&&(o[l].amount||0)>0&&(a.paid=!0,o[l].amount--),i.push(a)}),e.data.persistCompletedOrderItem(e.selectedTableNr,i),e.snackBar.open("Bezahlvorgang erfolgreich abgeschlossen!","X",{duration:2500}),e.reset()})()}static{this.\u0275fac=function(i){return new(i||n)(t.rXU(g.d),t.rXU(_.u),t.rXU(h.nX),t.rXU(k.UG))}}static{this.\u0275cmp=t.VBU({type:n,selectors:[["app-pay"]],decls:16,vars:11,consts:[["id","open-items-header",4,"ngIf"],["id","open-items-wrapper",4,"ngIf"],["id","all-items-header",4,"ngIf"],["title","alkoholische Getr\xe4nke",3,"items","itemsChange",4,"ngIf"],["title","anti-alkoholische Getr\xe4nke",3,"items","itemsChange",4,"ngIf"],["title","Speisen",3,"items","itemsChange",4,"ngIf"],["id","cart-wrapper"],["class","item",4,"ngFor","ngForOf"],["class","error",4,"ngIf"],["id","sum",4,"ngIf"],["class","button btn-ok","matRipple","",3,"click",4,"ngIf"],["matRipple","",1,"button","btn-danger",3,"click"],["id","open-items-header"],["id","open-items-wrapper"],["class","item","matRipple","",3,"click",4,"ngFor","ngForOf"],[4,"ngIf"],["matRipple","",1,"item",3,"click"],[1,"amount"],[1,"name"],[1,"price"],["id","all-items-header"],["title","alkoholische Getr\xe4nke",3,"items","itemsChange"],["title","anti-alkoholische Getr\xe4nke",3,"items","itemsChange"],["title","Speisen",3,"items","itemsChange"],[1,"item"],[1,"error"],["id","sum"],["matRipple","",1,"button","btn-ok",3,"click"]],template:function(i,o){if(1&i&&(t.DNE(0,x,2,0,"span",0),t.DNE(1,w,3,2,"div",1),t.DNE(2,G,2,0,"span",2),t.DNE(3,M,1,1,"app-order-category",3),t.DNE(4,j,1,1,"app-order-category",4),t.DNE(5,R,1,1,"app-order-category",5),t.j41(6,"div",6)(7,"h2"),t.EFF(8,"Warenkorb"),t.k0s(),t.DNE(9,N,3,3,"div",7),t.DNE(10,$,3,3,"div",7),t.DNE(11,X,2,0,"span",8),t.DNE(12,S,2,1,"span",9),t.DNE(13,Y,2,0,"button",10),t.j41(14,"button",11),t.bIt("click",function(){return o.reset()}),t.EFF(15,"Zur\xfccksetzen"),t.k0s()()),2&i){let a,l,r,m;t.Y8G("ngIf",o.selectedTableNr),t.R7$(1),t.Y8G("ngIf",o.selectedTableNr),t.R7$(1),t.Y8G("ngIf",o.selectedTableNr),t.R7$(1),t.Y8G("ngIf",o.alcoholDrinks),t.R7$(1),t.Y8G("ngIf",o.antiDrinks),t.R7$(1),t.Y8G("ngIf",o.food),t.R7$(4),t.Y8G("ngForOf",null==(a=o.getCartSummary())?null:a.drinks),t.R7$(1),t.Y8G("ngForOf",null==(l=o.getCartSummary())?null:l.food),t.R7$(1),t.Y8G("ngIf",0===(null==(r=o.getCartSummary())||null==r.food?null:r.food.length)&&0===(null==(r=o.getCartSummary())||null==r.drinks?null:r.drinks.length)),t.R7$(1),t.Y8G("ngIf",((null==(m=o.getCartSummary())?null:m.sum)||0)>0),t.R7$(1),t.Y8G("ngIf",o.selectedTableNr)}},dependencies:[p.Sq,p.bT,u.r6,D.A,T.TL],styles:["#cart-wrapper[_ngcontent-%COMP%]{width:100%;box-sizing:border-box;padding:0 20% 20%}#cart-wrapper[_ngcontent-%COMP%]   h2[_ngcontent-%COMP%]{text-align:center}#cart-wrapper[_ngcontent-%COMP%]   button[_ngcontent-%COMP%]{width:100%;margin-top:3vh}#cart-wrapper[_ngcontent-%COMP%]   .error[_ngcontent-%COMP%]{display:block;text-align:center}#cart-wrapper[_ngcontent-%COMP%]   #sum[_ngcontent-%COMP%]{margin-top:.5em;font-weight:500;border-top:1px solid;width:100%;display:block;padding-top:.25em}#open-items-header[_ngcontent-%COMP%]{width:100%;display:flex;align-items:center;justify-content:flex-start;padding:5px 10px;background:var(--danger);color:#fff}#open-items-wrapper[_ngcontent-%COMP%]   .item[_ngcontent-%COMP%]{width:100%;display:flex;align-items:center;justify-content:space-between;font-size:4vw;padding:10px 0}#open-items-wrapper[_ngcontent-%COMP%]   .item[_ngcontent-%COMP%]:nth-child(2n){background:var(--table-accent)}#open-items-wrapper[_ngcontent-%COMP%]   .item[_ngcontent-%COMP%]   .amount[_ngcontent-%COMP%]{width:15%;text-align:center}#open-items-wrapper[_ngcontent-%COMP%]   .item[_ngcontent-%COMP%]   .name[_ngcontent-%COMP%]{width:60%}#open-items-wrapper[_ngcontent-%COMP%]   .item[_ngcontent-%COMP%]   .price[_ngcontent-%COMP%]{width:25%}#all-items-header[_ngcontent-%COMP%]{width:100%;margin-top:3vh;display:flex;align-items:center;justify-content:flex-start;padding:5px 10px;background:var(--light);color:#fff}"]})}}return n})();var B=c(5553),V=c(9631),U=c(1801);const z=[{path:"open-tables",component:v},{path:"cart/:tableNr",component:C},{path:"cart",component:C},{path:"",redirectTo:"open-tables",pathMatch:"full"}];let A=(()=>{class n{static{this.\u0275fac=function(i){return new(i||n)}}static{this.\u0275mod=t.$C({type:n})}static{this.\u0275inj=t.G2t({imports:[p.MD,u.pZ,h.iI.forChild(z),B.h,V.fS,U.m_,k._T]})}}return n})()}}]);