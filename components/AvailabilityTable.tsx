import touchIn from '@utils/touchIn';
import { EventData } from '@models/event';
import { DateTimeRange } from '@models/DateTimeRange';
import { useTranslation } from 'next-i18next';
import { TouchEvent, useMemo, useRef, useState } from 'react';
import cx from 'classnames';
import { TimeRange } from '@models/time';

interface Props {
  event: EventData;
  readonly?: boolean;
  value?: DateTimeRange[];
  onChange?: (value: DateTimeRange[]) => void;
  result?: { name: string, picks: DateTimeRange[] }[];
}

function AvailabilityTable(props: Props) {

  const {
    event,
    readonly,
    value,
    onChange,
    result
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);

  const { t } = useTranslation();
  const [touchStart, setTouchStart] = useState<DateTimeRange>();
  const [touchEnd, setTouchEnd] = useState<DateTimeRange>();

  const options = useMemo(() => {
    if (readonly) return [];
    let options: DateTimeRange[] = [];
    event.availableDates.forEach(date => {
      event.availableTimes.forEach(time => {
        options.push(DateTimeRange(date, time));
      });
    });
    return options;
  }, [event]);

  const valueBetweenTouch = useMemo(() => {
    if (readonly || !touchStart || !touchEnd) return [];
    return options.filter(dtr => {
      const dtrTime = dtr.timeRange.start;
      const touchStartTime = touchStart.timeRange.start;
      const touchEndTime = touchEnd.timeRange.start;
      if ((dtrTime.laterThan(touchStartTime) &&
          dtrTime.earlierThan(touchEndTime) ||
          dtrTime.earlierThan(touchStartTime) &&
          dtrTime.laterThan(touchEndTime)) ||
        dtrTime.equals(touchStartTime) || dtrTime.equals(touchEndTime)) {
        const dtrDate = dtr.date;
        const touchStartDate = touchStart.date;
        const touchEndDate = touchEnd.date;
        if ((dtrDate.laterThan(touchStartDate) &&
            dtrDate.earlierThan(touchEndDate) ||
            dtrDate.earlierThan(touchStartDate) &&
            dtrDate.laterThan(touchEndDate)) ||
          dtrDate.equals(touchStartDate) ||
          dtrDate.equals(touchEndDate)) {
          return true;
        }
      }
    });
  }, [touchStart, touchEnd]);

  function getColor(dtr: DateTimeRange) {
    if (readonly) {
      let count = 0;
      result?.forEach(pick => {
        if (pick.picks.find(v => v.equals(dtr))) {
          count++;
        }
      });
      return {
        backgroundColor: `rgba(255, 193, 7, ${
          count / (result?.length || 1)})`
      };
    }
    if (touchStart && dtr.equals(touchStart)) {
      return value?.find(v => v.equals(touchStart))
        ? { backgroundColor: 'white' }
        : { backgroundColor: '#ffc107' };
    }
    if (touchStart && valueBetweenTouch.find(v => v.equals(dtr))) {
      return value?.find(v => v.equals(touchStart))
        ? { backgroundColor: 'white' }
        : { backgroundColor: '#ffc107' };
    }
    if (value && value.find(v => v.equals(dtr)))
      return { backgroundColor: '#ffc107' };
  }

  const handleTouchMove = (e: TouchEvent<HTMLTableElement>) => {
    return handleMove(e.touches[0]);
  };

  const handleMove = (touch: { clientX: number, clientY: number }) => {
    if (readonly) return;
    const containerRight = containerRef.current?.getBoundingClientRect().right;
    const containerLeft = containerRef.current?.getBoundingClientRect().left;
    const containerScrollLeft = containerRef.current?.scrollLeft;
    if (containerRight !== undefined && containerLeft !== undefined &&
      containerScrollLeft !== undefined) {
      if (containerRight - touch.clientX < 30)
        containerRef.current?.scrollTo({ left: containerScrollLeft + 3 });
      if (touch.clientX - containerLeft < 30)
        containerRef.current?.scrollTo({ left: containerScrollLeft - 3 });
    }
    const container = containerRef.current;
    if (!container) return;
    let result: DateTimeRange | undefined;
    Array.from(document.getElementsByClassName('date-time-range-option'))
      .map(timeRow => {
        const row = timeRow as unknown as HTMLDivElement;
        const dtrValue = row.attributes.getNamedItem('value')?.value;
        if (!dtrValue) return;
        const dtr = DateTimeRange().fromString(dtrValue);
        if (touchIn(touch, row.getBoundingClientRect())) {
          result = dtr;
        }
      });
    if (result) setTouchEnd(result);
  };

  const handleTouchEnd = () => {
    if (readonly) return;
    if (!onChange || !value) return;
    if (!touchStart) return;
    if (!touchEnd) {
      if (value.find(a => a.equals(touchStart)))
        onChange([...value.filter(v => !v.equals(touchStart))]);
      else onChange([...value, touchStart]);
      return;
    }
    const append = valueBetweenTouch;
    let v: any = {};
    value.forEach((t) => v[t.toString()] = true);
    if (value.find(r => r.equals(touchStart))) append.forEach(
      (t) => v[t.toString()] = false);
    else append.forEach((t) => v[t.toString()] = true);
    onChange(Object.keys(v).filter(t => v[t])
      .map(t => DateTimeRange().fromString(t)));
    setTouchStart(undefined);
    setTouchEnd(undefined);
  };

  const mergedTimeRange: TimeRange[][] = [];
  event.availableTimes.forEach(t => {
    const f = mergedTimeRange.find(a => a[a.length - 1].end.equals(t.start));
    if (f) {
      f.push(t);
    } else {
      mergedTimeRange.push([t]);
    }
  });

  return <div className="flex w-full">
    <div className="pt-12">
      {mergedTimeRange.map((range, i) =>
        <div key={i} className="mb-4 mr-4">
          {range.map((t, j) => <>
            <p key={t.start.toString()} style={{ height: 48 }}>
              {t.start.toString()}
            </p>
            {j === range.length - 1 &&
              <p key={t.end.toString()} style={{ height: 24 }}>
                {t.end.toString()}
              </p>}
          </>)}
        </div>)}
    </div>
    <div
      className="flex flex-grow overflow-x-scroll pb-12 select-none"
      ref={containerRef}>
      {event.availableDates.map(date =>
        <div
          /* @ts-ignore */
          value={date.toString()}
          key={date.toString()}
          className="flex flex-col mr-2">
          <p className="text-center">{date.toString()}</p>
          <p className="text-center">
            {t('date_day_short_' + date.getDayCode())}
          </p>
          {mergedTimeRange.map((range, i) =>
            <div
              style={{ height: 48 * range.length + 24 }}
              key={i}
              className="flex flex-col border-2 border-black rounded-lg
               overflow-hidden mb-4">
              {range.map(time => {
                const dtr = DateTimeRange(date, time);
                return <div
                  /* @ts-ignore */
                  value={dtr.toString()}
                  key={dtr.toString()}
                  onTouchStart={() => {
                    !readonly && setTouchStart(dtr);
                  }}
                  onMouseDown={() => {
                    !readonly && setTouchStart(dtr);
                  }}
                  onTouchMove={handleTouchMove}
                  onMouseMove={handleMove}
                  onTouchEnd={handleTouchEnd}
                  onMouseUp={handleTouchEnd}
                  style={getColor(dtr)}
                  className={cx('date-time-range-option',
                    'flex-1 border-b border-black border-opacity-30 w-24',
                    !readonly && 'touch-none select-none')}>
                </div>;
              })}
            </div>
          )}
        </div>)}
    </div>
  </div>;
}

export default AvailabilityTable;
