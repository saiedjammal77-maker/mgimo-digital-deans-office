import styles from "./dial.module.css";

export function AtlasDial() {
  return (
    <div className={styles.chart} aria-hidden="true">
      <div className={styles.net} />
      <div className={styles.orbit} />
      <div className={styles.dial}>
        <div className={styles.ticks} />
        <div className={styles.globe}><i /><i /><i /></div>
        <div className={styles.cross} />
        <span className={styles.north}>N</span><span className={styles.south}>S</span>
        <span className={styles.east}>E</span><span className={styles.west}>W</span>
        <div className={styles.rose}>
          {Array.from({ length: 8 }, (_, index) => (
            <i key={index} style={{ transform: "rotate(" + index * 45 + "deg)" }} />
          ))}
          <b />
        </div>
      </div>
    </div>
  );
}
