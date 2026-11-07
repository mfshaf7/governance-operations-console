"use client";

import {useLayoutEffect,useRef} from "react";
import { TerasActionButton, TerasActionRow } from "./teras-action";
import {useRegisterPageSize,registerPageSizes} from "../console-integration/registers/use-register-page-size.ts";
import {TerasSelectControl} from "./teras-select-control";
import styles from "./teras-patterns.module.css";
import { TerasRecordMetaText } from "./teras-record-table";

// Navigation belongs to the register footer, outside its scrolling body.
// A missing total stays unknown; it is never inferred from a visible page.
export function TerasRegisterPagination({ label, offset, count, total, page, pending = false, unavailable = false, disabled = false,
  preferenceKey = label, hasPrevious, hasNext, onPrevious, onNext, onReset, nextLabel = "Next page" }: {
  preferenceKey?:string; label: string; offset: number; count: number; total?: number | null; page: number;
  pending?: boolean; unavailable?: boolean; disabled?:boolean; hasPrevious: boolean; hasNext: boolean;
  onPrevious: () => void; onNext: () => void; onReset?: () => void; nextLabel?: string;
}) {
  const {pageSize,setPageSize}=useRegisterPageSize(preferenceKey);
  const navigation=useRef<HTMLElement|null>(null),resetKey=useRef("");
  useLayoutEffect(()=>{
    if(pending)return;const key=JSON.stringify([offset,pageSize]);if(resetKey.current===key)return;resetKey.current=key;
    const body=navigation.current?.closest('[data-register-footer="true"]')?.querySelector<HTMLElement>('[data-teras-register-body="true"]');
    if(body){body.scrollTop=0;for(const frame of body.querySelectorAll<HTMLElement>('[data-profile]'))frame.scrollTop=0;}
  },[offset,pageSize,pending]);
  return <nav ref={navigation} aria-label={`${label} pages`} aria-busy={pending}>
    <TerasActionRow layout="split" end={<>
        <div className={styles.registerPageSize}><TerasRecordMetaText>Rows per page</TerasRecordMetaText><TerasSelectControl ariaLabel={`${label} rows per page`} placeholder="25" value={String(pageSize)} options={registerPageSizes.map(size=>({value:String(size),label:String(size)}))} onValueChange={value=>setPageSize(Number(value))} disabled={pending || disabled} menuPlacement="portal" /></div>
        {onReset?<TerasActionButton emphasis="secondary" disabled={pending || disabled} onClick={onReset}>Refresh first page</TerasActionButton>:null}
        <TerasActionButton emphasis="secondary" disabled={pending || disabled || unavailable || !hasPrevious} onClick={onPrevious}>Previous</TerasActionButton>
        <TerasActionButton emphasis="secondary" disabled={pending || disabled || unavailable || !hasNext} onClick={onNext}>{nextLabel}</TerasActionButton>
      </>}>
      <div role="status"><TerasRecordMetaText>{pending ? "Loading page…" : unavailable ? "Page unavailable" : `${count ? `Showing ${offset + 1}–${offset + count}${total == null ? "" : ` of ${total}`}` : hasNext ? "No matches yet" : "No matches"} · Page ${page}`}</TerasRecordMetaText></div>
    </TerasActionRow>
  </nav>;
}
