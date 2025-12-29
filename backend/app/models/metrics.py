"""
Metrics Database Models
Location: /Users/jrosenbaum/Documents/Code/md-converter/app/models/metrics.py

This module defines database models for tracking usage metrics, admin users, and sessions.
Uses SQLAlchemy 2.0 style with type hints.

Used by: app/api/routes.py for tracking conversions and page views
Related to: app/extensions.py for database connection
"""
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, Integer, Boolean, DateTime, Text, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from werkzeug.security import generate_password_hash, check_password_hash
from app.extensions import db


class AdminUser(db.Model):
    """
    Admin user model for backend authentication.

    Attributes:
        id: Primary key
        username: Unique username for login
        password_hash: Bcrypt hashed password
        created_at: Account creation timestamp
        last_login: Last successful login timestamp
    """
    __tablename__ = 'admin_users'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(80), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc)
    )
    last_login: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    sessions: Mapped[list["AdminSession"]] = relationship(
        "AdminSession",
        back_populates="user",
        cascade="all, delete-orphan"
    )

    def set_password(self, password: str) -> None:
        """Hash and set the user's password."""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        """Verify the provided password against the hash."""
        return check_password_hash(self.password_hash, password)

    def __repr__(self) -> str:
        return f'<AdminUser {self.username}>'


class Conversion(db.Model):
    """
    Conversion tracking model for monitoring usage and success rates.

    Attributes:
        id: Primary key
        job_id: UUID of the conversion job
        original_filename: Name of uploaded file
        file_size_bytes: Size of uploaded file in bytes
        formats: Comma-separated list of requested formats (docx,pdf,gdocs)
        success: Whether conversion completed successfully
        error_code: Error code if conversion failed (e.g., PANDOC_ERROR)
        processing_time_ms: Total processing time in milliseconds
        visitor_id: Anonymous visitor identifier (cookie/fingerprint)
        created_at: Conversion request timestamp
    """
    __tablename__ = 'conversions'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    job_id: Mapped[str] = mapped_column(String(36), unique=True, nullable=False, index=True)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    formats: Mapped[str] = mapped_column(String(100), nullable=False)  # e.g., "docx,pdf,gdocs"
    success: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)
    error_code: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, index=True)
    processing_time_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    visitor_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        index=True
    )

    # Composite indexes for common queries
    __table_args__ = (
        Index('ix_conversions_created_success', 'created_at', 'success'),
        Index('ix_conversions_visitor_created', 'visitor_id', 'created_at'),
    )

    def __repr__(self) -> str:
        return f'<Conversion {self.job_id} success={self.success}>'


class PageView(db.Model):
    """
    Page view tracking model for analytics.

    Attributes:
        id: Primary key
        path: Requested URL path
        referrer: HTTP referer header
        visitor_id: Anonymous visitor identifier (cookie/fingerprint)
        browser: Browser user agent string
        os: Operating system (parsed from user agent)
        device_type: Device type (desktop, mobile, tablet)
        created_at: Page view timestamp
    """
    __tablename__ = 'page_views'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    path: Mapped[str] = mapped_column(String(500), nullable=False, index=True)
    referrer: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    visitor_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    browser: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    os: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    device_type: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # desktop, mobile, tablet
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        index=True
    )

    # Composite indexes for common queries
    __table_args__ = (
        Index('ix_page_views_path_created', 'path', 'created_at'),
        Index('ix_page_views_visitor_created', 'visitor_id', 'created_at'),
    )

    def __repr__(self) -> str:
        return f'<PageView {self.path} at {self.created_at}>'


class AdminSession(db.Model):
    """
    Admin session tracking model for authentication.

    Attributes:
        id: Primary key
        user_id: Foreign key to admin_users table
        token_hash: SHA256 hash of session token
        expires_at: Session expiration timestamp
        revoked: Whether session has been manually revoked
        created_at: Session creation timestamp
    """
    __tablename__ = 'admin_sessions'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey('admin_users.id'), nullable=False, index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    revoked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    user: Mapped["AdminUser"] = relationship("AdminUser", back_populates="sessions")

    def is_valid(self) -> bool:
        """Check if session is valid (not expired and not revoked)."""
        now = datetime.now(timezone.utc)
        return not self.revoked and self.expires_at > now

    def __repr__(self) -> str:
        return f'<AdminSession user_id={self.user_id} valid={self.is_valid()}>'
