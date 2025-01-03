@echo off
 
call autoflake .
call black .
call isort .
call flake8 .