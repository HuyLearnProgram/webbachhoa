-- Vá bug: GetRevenueByWeekCycle trước đó cộng dồn TẤT CẢ đơn hàng theo order_time,
-- không lọc payment_status, nên đơn UNPAID/CANCELLED/PAYMENT_FAILED... vẫn được tính
-- vào doanh thu. Thêm điều kiện payment_status = 'PAID' vào JOIN.
-- Body gốc lấy từ SHOW CREATE PROCEDURE GetRevenueByWeekCycle trên DB dev, chỉ thêm
-- đúng 1 điều kiện, giữ nguyên toàn bộ logic chia tuần (7 ngày kể từ ngày 1 của tháng).

DROP PROCEDURE IF EXISTS GetRevenueByWeekCycle;

DELIMITER $$

CREATE PROCEDURE GetRevenueByWeekCycle(
    IN p_month INT,
    IN p_year INT
)
BEGIN
    DECLARE v_start_date DATE;
    DECLARE v_end_date DATE;

    -- Set start and end dates for the month
    SET v_start_date = STR_TO_DATE(CONCAT(p_year, '-', LPAD(p_month, 2, '0'), '-01'), '%Y-%m-%d');
    SET v_end_date = LAST_DAY(v_start_date);

    -- Create temporary table to store week ranges
    CREATE TEMPORARY TABLE temp_weeks (
        week_start DATE,
        week_end DATE,
        week_label VARCHAR(50)
    );

    -- Populate week ranges
    -- Bắt đầu từ ngày đầu tiên của tháng và tạo các khoảng 7 ngày
    SET @current_date = v_start_date;
    WHILE @current_date <= v_end_date DO
        INSERT INTO temp_weeks (week_start, week_end, week_label)
        SELECT
            @current_date,
            LEAST(DATE_ADD(@current_date, INTERVAL 6 DAY), v_end_date), -- đảm bảo không vượt quá cuối tháng
            CONCAT(
                DATE_FORMAT(@current_date, '%d/%m'),
                ' - ',
                DATE_FORMAT(LEAST(DATE_ADD(@current_date, INTERVAL 6 DAY), v_end_date), '%d/%m')
            );
        SET @current_date = DATE_ADD(@current_date, INTERVAL 7 DAY);
    END WHILE;

    -- Select revenue data joined with week ranges
    SELECT
        tw.week_label AS days,
        COALESCE(SUM(o.total_price), 0) AS total_revenue
    FROM temp_weeks tw
    LEFT JOIN orders o
        -- Sử dụng điều kiện này để bao gồm toàn bộ ngày cuối của tuần
        -- và loại bỏ điều kiện YEAR/MONTH dư thừa vì temp_weeks đã giới hạn trong tháng/năm.
        -- Chỉ tính đơn đã thanh toán thật (PAID) vào doanh thu.
        ON o.order_time >= tw.week_start AND o.order_time < (tw.week_end + INTERVAL 1 DAY)
        AND o.payment_status = 'PAID'
    GROUP BY tw.week_label, tw.week_start
    ORDER BY tw.week_start;

    -- Clean up
    DROP TEMPORARY TABLE temp_weeks;
END$$

DELIMITER ;
