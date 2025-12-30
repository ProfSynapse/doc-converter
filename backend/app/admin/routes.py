"""
Admin Routes
Provides endpoints for admin authentication and metrics.
"""
import logging
from datetime import datetime, timezone
from flask import jsonify, request
from sqlalchemy import func

from app.admin import admin_bp
from app.extensions import db
from app.models import AdminUser, Conversion, PageView

logger = logging.getLogger(__name__)


@admin_bp.route('/verify', methods=['POST'])
def verify_credentials():
    """
    Verify admin credentials.
    Called by Next.js to authenticate admin users.
    """
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')

        logger.info(f'Login attempt - username: {username}, password length: {len(password) if password else 0}')

        if not username or not password:
            return jsonify({'error': 'Username and password are required'}), 400

        # Find user in database
        user = AdminUser.query.filter_by(username=username).first()

        if not user:
            logger.warning(f'User not found: {username}')
            return jsonify({'error': 'Invalid credentials'}), 401

        logger.info(f'User found: {user.username} (id: {user.id}), hash prefix: {user.password_hash[:30]}...')

        password_ok = user.check_password(password)
        logger.info(f'Password check result: {password_ok}')

        if not password_ok:
            logger.warning(f'Failed admin login attempt for username: {username}')
            return jsonify({'error': 'Invalid credentials'}), 401

        # Update last login
        user.last_login = datetime.now(timezone.utc)
        db.session.commit()

        logger.info(f'Admin login successful: {username}')
        return jsonify({
            'id': user.id,
            'username': user.username,
        })

    except Exception as e:
        logger.error(f'Admin verification error: {e}', exc_info=True)
        return jsonify({'error': 'Authentication failed'}), 500


@admin_bp.route('/metrics/stats', methods=['GET'])
def get_stats():
    """
    Get aggregate statistics for the admin dashboard.
    """
    try:
        # Conversion stats
        total_conversions = Conversion.query.count()
        successful_conversions = Conversion.query.filter_by(success=True).count()
        failed_conversions = Conversion.query.filter_by(success=False).count()

        # Page view stats
        total_page_views = PageView.query.count()
        unique_visitors = db.session.query(
            func.count(func.distinct(PageView.visitor_id))
        ).scalar() or 0

        # Format breakdown - count occurrences of each format
        format_counts = {'docx': 0, 'pdf': 0, 'gdocs': 0}
        conversions = Conversion.query.all()
        for conv in conversions:
            formats = conv.formats.split(',') if conv.formats else []
            for fmt in formats:
                fmt = fmt.strip().lower()
                if fmt in format_counts:
                    format_counts[fmt] += 1

        return jsonify({
            'totalConversions': total_conversions,
            'successfulConversions': successful_conversions,
            'failedConversions': failed_conversions,
            'totalPageViews': total_page_views,
            'uniqueVisitors': unique_visitors,
            'formatBreakdown': format_counts,
        })

    except Exception as e:
        logger.error(f'Stats fetch error: {e}', exc_info=True)
        return jsonify({'error': 'Failed to fetch stats'}), 500


@admin_bp.route('/metrics/conversions', methods=['GET'])
def get_conversions():
    """
    Get recent conversions for the admin dashboard.
    """
    try:
        limit = request.args.get('limit', 20, type=int)
        conversions = Conversion.query.order_by(
            Conversion.created_at.desc()
        ).limit(limit).all()

        return jsonify({
            'conversions': [
                {
                    'id': c.id,
                    'job_id': c.job_id,
                    'original_filename': c.original_filename,
                    'formats': c.formats,
                    'success': c.success,
                    'error_code': c.error_code,
                    'processing_time_ms': c.processing_time_ms,
                    'created_at': c.created_at.isoformat(),
                }
                for c in conversions
            ]
        })

    except Exception as e:
        logger.error(f'Conversions fetch error: {e}', exc_info=True)
        return jsonify({'error': 'Failed to fetch conversions'}), 500


@admin_bp.route('/metrics/page-views', methods=['GET'])
def get_page_views():
    """
    Get recent page views for the admin dashboard.
    """
    try:
        limit = request.args.get('limit', 20, type=int)
        page_views = PageView.query.order_by(
            PageView.created_at.desc()
        ).limit(limit).all()

        return jsonify({
            'pageViews': [
                {
                    'id': pv.id,
                    'path': pv.path,
                    'referrer': pv.referrer,
                    'browser': pv.browser,
                    'os': pv.os,
                    'device_type': pv.device_type,
                    'created_at': pv.created_at.isoformat(),
                }
                for pv in page_views
            ]
        })

    except Exception as e:
        logger.error(f'Page views fetch error: {e}', exc_info=True)
        return jsonify({'error': 'Failed to fetch page views'}), 500
