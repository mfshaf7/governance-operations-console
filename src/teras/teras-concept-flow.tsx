import styles from "./teras-patterns.module.css";
/** Explanatory relationships, without progress or completion semantics. */
export function TerasConceptFlow({label,items}: {label:string;items:readonly {title:string;detail:string}[]}) {
  return <ol className={styles.terasConceptFlow} aria-label={label}>
    {items.map((item,index)=><li key={item.title} className={styles.terasConceptFlowItem}>
      <strong>{item.title}</strong><p>{item.detail}</p>
      {index<items.length-1?<span className={styles.terasConceptFlowArrow} aria-hidden="true">→</span>:null}
    </li>)}
  </ol>;
}
