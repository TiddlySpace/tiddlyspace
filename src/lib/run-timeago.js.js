/***
 Apply timeago against class annotated elements
 matching the format: <el class="timeago" title="timestamp"/>.
 Requires jquery,timeago - http://timeago.yarp.com/
 ***/
//{{{
$(function () {

    function dateString(date) {
        return new Date(Date.UTC(
            parseInt(date.substr(0, 4), 10),
            parseInt(date.substr(4, 2), 10) - 1,
            parseInt(date.substr(6, 2), 10),
            parseInt(date.substr(8, 2), 10),
            parseInt(date.substr(10, 2), 10),
            parseInt(date.substr(12, 2) || "0", 10),
            parseInt(date.substr(14, 3) || "0", 10)
        )).toISOString();
    }

    $(".timeago").each(function () {
        $(this).attr('title', dateString($(this).attr('title')));
        $(this).timeago();
    });
});
//}}}


