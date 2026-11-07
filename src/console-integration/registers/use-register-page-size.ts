"use client";
import {useCallback,useEffect,useSyncExternalStore} from "react";

export const registerPageSizes = [25,50,100] as const;
export type RegisterPageSize = typeof registerPageSizes[number];
const values = new Map<string,RegisterPageSize>(), listeners = new Set<()=>void>(), initialized = new Set<string>();
export function isRegisterPageSize(value:unknown):value is RegisterPageSize{return registerPageSizes.includes(value as RegisterPageSize);}
function subscribe(listener:()=>void){listeners.add(listener);return()=>{listeners.delete(listener);};}
function emit(){for(const listener of listeners)listener();}
// Only this presentation preference is retained; records and authority never are.
export function useRegisterPageSize(register:string){
 const snapshot=useCallback(()=>values.get(register)??25,[register]);
 const pageSize=useSyncExternalStore(subscribe,snapshot,()=>25 as RegisterPageSize);
 useEffect(()=>{if(initialized.has(register))return;initialized.add(register);try{const value=Number(localStorage.getItem('console.register-page-size:'+register));if(isRegisterPageSize(value)){values.set(register,value);emit();}}catch{/* Storage is optional. */}},[register]);
 const setPageSize=useCallback((value:number)=>{if(!isRegisterPageSize(value))return;values.set(register,value);try{localStorage.setItem('console.register-page-size:'+register,String(value));}catch{/* In-memory choice still works. */}emit();},[register]);
 return {pageSize,setPageSize};
}
