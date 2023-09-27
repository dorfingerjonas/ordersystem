"use strict";(self.webpackChunkordersystem=self.webpackChunkordersystem||[]).push([[683],{3683:(Z,a,o)=>{o.r(a),o.d(a,{OrderModule:()=>x});var d=o(8583),l=o(2921),u=o(9577),h=o(9976),t=o(7716),m=o(4471),p=o(6690),f=o(3632),O=o(9785),v=o(6312);let C=(()=>{class i{constructor(n){this.db=n}persist(n){return new Promise((e,s)=>{this.db.list("orders").push(n).then(c=>e(c)).catch(c=>s(c))})}}return i.\u0275fac=function(n){return new(n||i)(t.LFG(v.KQ))},i.\u0275prov=t.Yz7({token:i,factory:i.\u0275fac,providedIn:"root"}),i})();var y=o(7556);const M=function(){return{color:"var(--dark-gray)"}};function b(i,r){if(1&i){const n=t.EpF();t.TgZ(0,"div",4),t.NdJ("click",function(s){t.CHM(n);const c=r.$implicit;return t.oxw(2).increaseAmount(s,c)}),t.TgZ(1,"span",5),t._uU(2),t.qZA(),t.TgZ(3,"span",6),t._uU(4),t.qZA(),t.TgZ(5,"span",7),t._uU(6),t.qZA(),t.TgZ(7,"span",8),t.NdJ("click",function(){t.CHM(n);const s=r.$implicit;return t.oxw(2).decreaseAmount(s)}),t._UZ(8,"fa-icon",9),t.qZA(),t.qZA()}if(2&i){const n=r.$implicit,e=t.oxw(2);t.xp6(2),t.Oqu(n.amount||0),t.xp6(2),t.Oqu(n.name),t.xp6(2),t.hij("",n.price,"\u20ac"),t.xp6(2),t.Q6J("icon",e.minusIcon)("styles",t.DdM(5,M))}}function P(i,r){if(1&i&&(t.TgZ(0,"div",2),t.TgZ(1,"span"),t._uU(2),t.qZA(),t.YNc(3,b,9,6,"div",3),t.qZA()),2&i){const n=r.$implicit;t.xp6(2),t.Oqu(n.title),t.xp6(1),t.Q6J("ngForOf",n.items)}}const _=[{path:"",component:(()=>{class i{constructor(n,e,s,c,g,k,T){this.router=n,this.loading=e,this.header=s,this.drinkService=c,this.foodService=g,this.orderService=k,this.auth=T,this.minusIcon=h.Kl4,this.subscriptions=[],this.displayTable=[],this.drinks=[],this.food=[],this.tableNr=this.router.url.replace("/order/","")}ngOnInit(){setTimeout(()=>this.header.text=`Tisch: ${this.tableNr}`);let n=this.drinkService.drinks.subscribe(e=>{this.drinks=e,this.buildDisplayTable()});this.subscriptions.push(n),n=this.foodService.food.subscribe(e=>{this.food=e,this.buildDisplayTable()}),this.subscriptions.push(n)}ngOnDestroy(){this.subscriptions.forEach(n=>{n.unsubscribe()})}increaseAmount(n,e){["svg","fa-icon","path"].includes(n.target.localName)||(e.amount=(e.amount||0)+1)}decreaseAmount(n){n.amount&&n.amount>0&&(n.amount=n.amount-1)}order(){const n={id:Date.now(),drinks:this.drinks.filter(e=>(e.amount||0)>0),food:this.food.filter(e=>(e.amount||0)>0),table:{nr:this.tableNr},timestamp:Date.now(),waiter:this.auth.username};this.loading.activateLoading(),this.orderService.persist(n).then(()=>{this.loading.deactivateLoading(),this.router.navigateByUrl("/tables")}).catch(e=>{this.loading.deactivateLoading()})}isOrderValid(){const n=this.drinks.filter(s=>(s.amount||0)>0),e=this.food.filter(s=>(s.amount||0)>0);return n.length>0||e.length>0}buildDisplayTable(){this.displayTable=[{title:"alkoholische Getr\xe4nke",items:this.drinks.filter(n=>"alcohol"===n.category)},{title:"alkoholfreie Getr\xe4nke",items:this.drinks.filter(n=>"anti"===n.category)},{title:"Speisen",items:this.food}],this.loading.deactivateLoading()}}return i.\u0275fac=function(n){return new(n||i)(t.Y36(l.F0),t.Y36(m.b),t.Y36(p.r),t.Y36(f.$),t.Y36(O.d),t.Y36(C),t.Y36(y.e))},i.\u0275cmp=t.Xpm({type:i,selectors:[["app-order"]],decls:3,vars:2,consts:[["class","category",4,"ngFor","ngForOf"],[1,"button","btn-danger",3,"disabled","click"],[1,"category"],["class","item",3,"click",4,"ngFor","ngForOf"],[1,"item",3,"click"],[1,"amount"],[1,"name"],[1,"price"],[1,"minus",3,"click"],[3,"icon","styles"]],template:function(n,e){1&n&&(t.YNc(0,P,4,2,"div",0),t.TgZ(1,"button",1),t.NdJ("click",function(){return e.order()}),t._uU(2,"Bestellen"),t.qZA()),2&n&&(t.Q6J("ngForOf",e.displayTable),t.xp6(1),t.Q6J("disabled",!e.isOrderValid()))},directives:[d.sg,u.BN],styles:["[_nghost-%COMP%]{width:100%;display:flex;flex-direction:column}[_nghost-%COMP%]   .category[_ngcontent-%COMP%] > span[_ngcontent-%COMP%]{width:100%;display:block;background:var(--accent);font-size:4vw;color:var(--dark-gray);font-weight:bolder;padding:1% 2%;box-sizing:border-box}[_nghost-%COMP%]   .category[_ngcontent-%COMP%]   .item[_ngcontent-%COMP%]{padding:3% 1%;box-sizing:border-box;font-size:3.5vw;display:flex;flex-direction:row;z-index:99}[_nghost-%COMP%]   .category[_ngcontent-%COMP%]   .item[_ngcontent-%COMP%]:nth-child(2n-1){background:var(--table-accent)}[_nghost-%COMP%]   .category[_ngcontent-%COMP%]   .item[_ngcontent-%COMP%]   .amount[_ngcontent-%COMP%]{width:10%;display:flex;justify-content:center}[_nghost-%COMP%]   .category[_ngcontent-%COMP%]   .item[_ngcontent-%COMP%]   .name[_ngcontent-%COMP%]{width:60%;display:flex;justify-content:flex-start}[_nghost-%COMP%]   .category[_ngcontent-%COMP%]   .item[_ngcontent-%COMP%]   .price[_ngcontent-%COMP%]{width:10%;display:flex;justify-content:center}[_nghost-%COMP%]   .category[_ngcontent-%COMP%]   .item[_ngcontent-%COMP%]   .minus[_ngcontent-%COMP%]{width:20%;display:flex;justify-content:center;align-items:center;z-index:101}[_nghost-%COMP%]   .category[_ngcontent-%COMP%]   .item[_ngcontent-%COMP%]   .minus[_ngcontent-%COMP%] > span[_ngcontent-%COMP%]{width:4vw;height:4vw;background:var(--dark-gray);color:var(--white);display:flex;justify-content:center;align-items:center;border-radius:50%}[_nghost-%COMP%]   .button[_ngcontent-%COMP%]{width:80%;margin:15% 10%;transition:all .3s ease-in-out}"]}),i})()}];let x=(()=>{class i{}return i.\u0275mod=t.oAB({type:i}),i.\u0275inj=t.cJS({factory:function(n){return new(n||i)},imports:[[d.ez,l.Bz.forChild(_),u.uH]]}),i})()}}]);