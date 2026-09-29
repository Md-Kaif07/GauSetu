import React, {createContext,useContext,useState,useCallback} from 'react';
import {seedData} from './data.mjs';
import {validateBackup} from './domain.mjs';
const KEY='gausetu-unified-v1', Context=createContext(null);
function load(){
  try {const raw=localStorage.getItem(KEY);return {state:raw?validateBackup(JSON.parse(raw)):seedData(),error:''};}
  catch {return {state:seedData(),error:'Saved data could not be read. A temporary demo is open; the old backup has not been overwritten. Export what you need before saving changes.'};}
}
export function Store({children}) {
  const [initial]=useState(load),[state,setState]=useState(initial.state),[storageError,setStorageError]=useState(initial.error);
  const update=useCallback(transform=>setState(previous=>{
    const next=typeof transform==='function'?transform(previous):transform;
    // Persist synchronously so a navigation/reload cannot race an effect.
    try {localStorage.setItem(KEY,JSON.stringify(next));queueMicrotask(()=>setStorageError(''));}
    catch {queueMicrotask(()=>setStorageError('Browser storage is full or unavailable. Changes are only in memory. Export a JSON backup before closing this page.'));}
    return next;
  }),[]);
  return <Context.Provider value={{state,update,storageError}}>{children}</Context.Provider>;
}
export const useStore=()=>useContext(Context);
