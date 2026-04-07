/*
  Xóa user và mọi bản ghi tham chiếu user_id (tránh Msg 547 / fk_rh_user).

  Cách dùng: đặt @UserId = id trong bảng users, rồi Execute toàn bộ script.
*/

SET NOCOUNT ON;

DECLARE @UserId BIGINT = 1;  -- <<< ĐỔI SỐ NÀY

BEGIN TRANSACTION;

BEGIN TRY
    DELETE FROM dbo.reading_history WHERE user_id = @UserId;
    DELETE FROM dbo.favorites      WHERE user_id = @UserId;
    DELETE FROM dbo.comments       WHERE user_id = @UserId;

    UPDATE dbo.novels SET user_id = NULL WHERE user_id = @UserId;

    DELETE FROM dbo.users WHERE id = @UserId;

    COMMIT TRANSACTION;
    PRINT N'Đã xóa user ' + CAST(@UserId AS NVARCHAR(20)) + N' và dữ liệu liên quan.';
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
