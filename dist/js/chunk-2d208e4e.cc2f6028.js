(window["webpackJsonp"]=window["webpackJsonp"]||[]).push([["chunk-2d208e4e"],{a779:function(e,t,n){"use strict";n.r(t),n.d(t,"AppWeb",(function(){return s}));var i=n("1547");class s extends i["a"]{constructor(){super(),this.handleVisibilityChange=()=>{const e={isActive:!0!==document.hidden};this.notifyListeners("appStateChange",e)},document.addEventListener("visibilitychange",this.handleVisibilityChange,!1)}exitApp(){throw this.unimplemented("Not implemented on web.")}async getInfo(){throw this.unimplemented("Not implemented on web.")}async getLaunchUrl(){return{url:""}}async getState(){return{isActive:!0!==document.hidden}}}}}]);
//# sourceMappingURL=chunk-2d208e4e.cc2f6028.js.map