import { useState, useEffect, useRef, memo } from "react";
import PropTypes from "prop-types";
import { styles } from "../styles/styles.js";

/**
 * Custom DatePicker component styled with pure CSS-in-JS.
 * Allows picking future dates from a beautiful calendar interface.
 */
function DatePicker(props) {
  const { id, value, onChange, min, error } = props;
  const [isOpen, setIsOpen] = useState(false);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
  }

  function getFirstDayIndex(year, month) {
    return new Date(year, month, 1).getDay();
  }

  function handlePrevMonth() {
    setCurrentMonth((prev) => {
      if (prev === 0) {
        setCurrentYear((y) => y - 1);
        return 11;
      }
      return prev - 1;
    });
  }

  function handleNextMonth() {
    setCurrentMonth((prev) => {
      if (prev === 11) {
        setCurrentYear((y) => y + 1);
        return 0;
      }
      return prev + 1;
    });
  }

  function handleSelectDay(day) {
    const selectedDate = new Date(currentYear, currentMonth, day);
    const yyyy = selectedDate.getFullYear();
    const mm = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const dd = String(selectedDate.getDate()).padStart(2, "0");
    const formatted = `${yyyy}-${mm}-${dd}`;
    onChange(formatted);
    setIsOpen(false);
  }

  const totalDays = getDaysInMonth(currentYear, currentMonth);
  const firstDayIdx = getFirstDayIndex(currentYear, currentMonth);
  let minDate = null;
  if (min) {
    const [y, m, d] = min.split("-").map(Number);
    minDate = new Date(y, m - 1, d);
    minDate.setHours(0, 0, 0, 0);
  }

  const daysGrid = [];
  for (let i = 0; i < firstDayIdx; i++) {
    daysGrid.push(null);
  }
  for (let d = 1; d <= totalDays; d++) {
    daysGrid.push(d);
  }

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", width: "100%" }}
    >
      <input
        id={id}
        type="text"
        readOnly
        placeholder="Select Date"
        value={value}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsOpen((prev) => !prev);
          }
        }}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls="calendar-popup"
        style={error ? styles.inputError : styles.input}
      />
      {isOpen && (
        <div
          id="calendar-popup"
          role="dialog"
          aria-label="Calendar"
          style={styles.calendarDropdown}
        >
          <div style={styles.calendarHeader}>
            <button
              type="button"
              onClick={handlePrevMonth}
              aria-label="Previous month"
              style={styles.calNavBtn}
            >
              ◀
            </button>
            <span style={styles.calTitle}>
              {monthNames[currentMonth]} {currentYear}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              aria-label="Next month"
              style={styles.calNavBtn}
            >
              ▶
            </button>
          </div>

          <div style={styles.calDayNames}>
            {dayNames.map((d) => (
              <span key={d} style={styles.calDayNameLabel}>
                {d}
              </span>
            ))}
          </div>

          <div style={styles.calDaysGrid}>
            {daysGrid.map((day, idx) => {
              if (day === null) {
                return (
                  <span
                    key={`empty-${idx}`}
                    style={styles.calDayEmpty}
                  />
                );
              }

              const cellDate = new Date(currentYear, currentMonth, day);
              cellDate.setHours(0, 0, 0, 0);

              const isPast = minDate && cellDate < minDate;
              const paddedMonth = String(currentMonth + 1).padStart(
                2,
                "0"
              );
              const paddedDay = String(day).padStart(2, "0");
              const isSelected =
                value === `${currentYear}-${paddedMonth}-${paddedDay}`;

              return (
                <button
                  key={day}
                  type="button"
                  disabled={isPast}
                  onClick={() => handleSelectDay(day)}
                  aria-label={`${day} ${monthNames[currentMonth]} ${currentYear}`}
                  style={{
                    ...styles.calDayCell,
                    ...(isPast ? styles.calDayDisabled : {}),
                    ...(isSelected ? styles.calDaySelected : {}),
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

DatePicker.propTypes = {
  id: PropTypes.string,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  min: PropTypes.string,
  error: PropTypes.string,
};

export default memo(DatePicker);
